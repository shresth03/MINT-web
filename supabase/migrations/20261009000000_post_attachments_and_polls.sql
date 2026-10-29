-- Post attachments and polls for the new composer (web + mobile), plus two
-- security fixes they depend on.
--
--   1. content.guard_post_update: anon could rewrite any post, and any signed-in
--      user could change any column of someone else's post through the
--      "Anyone can update likes" policy. Non-authors may now only touch the
--      engagement counters (likes / reply_count / repost_count), which both
--      apps still write directly.
--   2. mint-media storage: uploads and deletes are limited to the caller's own
--      {user_id}/ folder (the path both apps already use). Bucket cap 100 MB.
--   3. content.post_attachments: up to 4 files per post (image/video/file/audio).
--   4. content.polls / poll_options / poll_votes: 2-4 options, 1 h - 7 d,
--      one final vote per user, votes private (counts via RPC only).
--   5. RPCs: social_create_post(jsonb) (the name/shape mobile already calls),
--      poll_vote, poll_get_for_posts, attachment_get_for_posts.
--
-- New tables are read-only to clients; every write goes through the RPCs.

begin;

-- ─── 1. Post update guard ──────────────────────────────────────────────────

create or replace function content.guard_post_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if coalesce(current_setting('app.system_write', true), 'off') = 'on' then
    return new;
  end if;
  if auth.role() = 'anon' then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  -- No end user: service role, cron, migrations.
  if v_uid is null or admin.is_staff() then
    return new;
  end if;
  if new.moderation_status is distinct from old.moderation_status
     or new.moderation_reason is distinct from old.moderation_reason then
    raise exception 'moderation_fields_are_staff_only' using errcode = '42501';
  end if;
  if old.deleted_at is not null and new.deleted_at is null then
    raise exception 'deleted_posts_cannot_be_restored' using errcode = '42501';
  end if;
  if new.author_id is distinct from old.author_id then
    raise exception 'author_is_immutable' using errcode = '42501';
  end if;
  if old.author_id is distinct from v_uid
     and (to_jsonb(new) - array['likes', 'reply_count', 'repost_count', 'fts'])
         is distinct from
         (to_jsonb(old) - array['likes', 'reply_count', 'repost_count', 'fts']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return new;
end $$;

-- ─── 2. mint-media storage ─────────────────────────────────────────────────

update storage.buckets
   set file_size_limit = 104857600  -- 100 MB; per-kind limits are checked in social_create_post
 where id = 'mint-media';

drop policy if exists "Auth users upload media" on storage.objects;
create policy "Auth users upload media" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'mint-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Auth users delete own media" on storage.objects;
create policy "Auth users delete own media" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'mint-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ─── 3. Attachments ────────────────────────────────────────────────────────

create table content.post_attachments (
  id               bigint generated always as identity primary key,
  post_id          bigint not null references content.posts(id) on delete cascade,
  position         smallint not null check (position between 0 and 3),
  kind             text not null check (kind in ('image', 'video', 'file', 'audio')),
  storage_path     text not null,
  url              text not null,
  file_name        text check (char_length(file_name) <= 255),
  mime_type        text,
  size_bytes       bigint check (size_bytes >= 0),
  duration_seconds numeric(10, 2) check (duration_seconds >= 0),
  width            integer check (width > 0),
  height           integer check (height > 0),
  thumbnail_url    text,
  created_at       timestamptz not null default now(),
  unique (post_id, position)
);

alter table content.post_attachments enable row level security;

create policy "Read attachments of visible posts" on content.post_attachments
  for select to anon, authenticated
  using (content.can_view_post(post_id));

revoke all on content.post_attachments from anon, authenticated;
grant select on content.post_attachments to anon, authenticated;
grant all on content.post_attachments to service_role;

-- ─── 4. Polls ──────────────────────────────────────────────────────────────

create table content.polls (
  post_id    bigint primary key references content.posts(id) on delete cascade,
  ends_at    timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_at > created_at)
);

create table content.poll_options (
  id       bigint generated always as identity primary key,
  post_id  bigint not null references content.polls(post_id) on delete cascade,
  position smallint not null check (position between 0 and 3),
  label    text not null check (char_length(btrim(label)) between 1 and 80),
  unique (post_id, position),
  unique (post_id, id)
);

create table content.poll_votes (
  post_id    bigint not null,
  user_id    uuid not null references identity.profiles(id) on delete cascade,
  option_id  bigint not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id),
  -- The option must belong to the same poll.
  foreign key (post_id, option_id)
    references content.poll_options(post_id, id) on delete cascade
);

create index poll_votes_option_idx on content.poll_votes (option_id);

alter table content.polls        enable row level security;
alter table content.poll_options enable row level security;
alter table content.poll_votes   enable row level security;

create policy "Read polls of visible posts" on content.polls
  for select to anon, authenticated
  using (content.can_view_post(post_id));

create policy "Read poll options of visible posts" on content.poll_options
  for select to anon, authenticated
  using (content.can_view_post(post_id));

create policy "Read own poll votes" on content.poll_votes
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on content.polls, content.poll_options, content.poll_votes from anon, authenticated;
grant select on content.polls, content.poll_options to anon, authenticated;
grant select on content.poll_votes to authenticated;
grant all on content.polls, content.poll_options, content.poll_votes to service_role;

-- ─── 5. RPCs ───────────────────────────────────────────────────────────────

-- Batch read, same shape as reaction_get_for_posts.
create or replace function public.attachment_get_for_posts(p_post_ids bigint[])
returns table (post_id bigint, attachments jsonb)
language sql
stable security definer
set search_path = ''
as $$
  select a.post_id,
         jsonb_agg(jsonb_build_object(
           'id',               a.id,
           'position',         a.position,
           'kind',             a.kind,
           'url',              a.url,
           'file_name',        a.file_name,
           'mime_type',        a.mime_type,
           'size_bytes',       a.size_bytes,
           'duration_seconds', a.duration_seconds,
           'width',            a.width,
           'height',           a.height,
           'thumbnail_url',    a.thumbnail_url
         ) order by a.position)
  from content.post_attachments a
  where a.post_id = any (p_post_ids[1:200])
    and content.can_view_post(a.post_id)
  group by a.post_id
$$;

create or replace function public.poll_get_for_posts(p_post_ids bigint[])
returns table (
  post_id      bigint,
  ends_at      timestamptz,
  is_closed    boolean,
  total_votes  integer,
  my_option_id bigint,
  options      jsonb
)
language sql
stable security definer
set search_path = ''
as $$
  select p.post_id,
         p.ends_at,
         p.ends_at <= now(),
         (select count(*)::int from content.poll_votes v where v.post_id = p.post_id),
         (select v.option_id from content.poll_votes v
           where v.post_id = p.post_id and v.user_id = auth.uid()),
         (select jsonb_agg(jsonb_build_object(
                   'id',       o.id,
                   'position', o.position,
                   'label',    o.label,
                   'votes',    (select count(*)::int from content.poll_votes v where v.option_id = o.id)
                 ) order by o.position)
            from content.poll_options o where o.post_id = p.post_id)
  from content.polls p
  where p.post_id = any (p_post_ids[1:200])
    and content.can_view_post(p.post_id)
$$;

create or replace function public.poll_vote(p_post_id bigint, p_option_id bigint)
returns table (
  post_id      bigint,
  ends_at      timestamptz,
  is_closed    boolean,
  total_votes  integer,
  my_option_id bigint,
  options      jsonb
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := admin.require_user();
  v_ends_at timestamptz;
  v_rows    integer;
begin
  if admin.is_banned(v_uid) then
    raise exception 'account_restricted' using errcode = '42501';
  end if;
  if not content.can_view_post(p_post_id, v_uid) then
    raise exception 'post_not_found' using errcode = 'P0002';
  end if;

  select pl.ends_at into v_ends_at from content.polls pl where pl.post_id = p_post_id;
  if not found then
    raise exception 'poll_not_found' using errcode = 'P0002';
  end if;
  if v_ends_at <= now() then
    raise exception 'poll_closed' using errcode = '22023';
  end if;
  if not exists (select 1 from content.poll_options o
                 where o.post_id = p_post_id and o.id = p_option_id) then
    raise exception 'poll_option_not_found' using errcode = 'P0002';
  end if;

  insert into content.poll_votes (post_id, user_id, option_id)
  values (p_post_id, v_uid, p_option_id)
  on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'already_voted' using errcode = '23505';
  end if;

  return query select * from public.poll_get_for_posts(array[p_post_id]);
end $$;

-- Creates a post with optional attachments and poll in one transaction.
-- Mobile already calls this name with { p_payload }. Payload keys:
--   body, post_type ('general' | 'news'), region, region_lat, region_lng, tag,
--   media_url, moderation_status ('under_review' only, to hold a post back),
--   attachments: [{ kind, storage_path, url, file_name?, duration_seconds?,
--                   width?, height?, thumbnail_path? }]   (max 4, in order)
--   poll:        { options: [text, ...] (2-4), duration_hours: 1..168 }
-- Attachments must already be uploaded to mint-media under {user_id}/; size
-- and MIME type are read from storage, not trusted from the client.
create or replace function public.social_create_post(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid         uuid := admin.require_user();
  v_body        text := btrim(coalesce(p_payload->>'body', ''));
  v_post_type   text := coalesce(nullif(p_payload->>'post_type', ''), 'general');
  v_attachments jsonb := coalesce(p_payload->'attachments', '[]'::jsonb);
  v_poll        jsonb := p_payload->'poll';
  v_media_url   text := nullif(p_payload->>'media_url', '');
  v_status      text := 'visible';
  v_post        content.posts;
  v_att         jsonb;
  v_pos         integer := 0;
  v_kind        text;
  v_path        text;
  v_url         text;
  v_base        text;
  v_thumb_path  text;
  v_size        bigint;
  v_mime        text;
  v_limit       bigint;
  v_options     jsonb;
  v_hours       integer;
  v_label       text;
  v_opt_pos     integer := 0;
begin
  if jsonb_typeof(v_attachments) <> 'array' then
    raise exception 'invalid_attachments' using errcode = '22023';
  end if;
  if jsonb_array_length(v_attachments) > 4 then
    raise exception 'too_many_attachments' using errcode = '22023';
  end if;
  if char_length(v_body) > 500 then
    raise exception 'body_too_long' using errcode = '22001';
  end if;
  if v_body = '' and jsonb_array_length(v_attachments) = 0
     and v_media_url is null and v_poll is null then
    raise exception 'empty_post' using errcode = '22023';
  end if;
  if v_poll is not null and v_post_type = 'news' then
    raise exception 'poll_not_allowed_on_news' using errcode = '22023';
  end if;
  if p_payload->>'moderation_status' = 'under_review' then
    v_status := 'under_review';
  end if;

  -- Older clients only read posts.media_url, so mirror the first image there.
  if v_media_url is null then
    select a->>'url' into v_media_url
      from jsonb_array_elements(v_attachments) a
     where a->>'kind' = 'image'
     limit 1;
  end if;

  insert into content.posts (
    author_id, body, post_type, region, region_lat, region_lng, tag,
    media_url, is_osint, moderation_status
  ) values (
    v_uid, v_body, v_post_type,
    nullif(p_payload->>'region', ''),
    (p_payload->>'region_lat')::double precision,
    (p_payload->>'region_lng')::double precision,
    nullif(p_payload->>'tag', ''),
    v_media_url, false, v_status
  )
  returning * into v_post;

  for v_att in select value from jsonb_array_elements(v_attachments) loop
    v_kind := v_att->>'kind';
    v_path := v_att->>'storage_path';
    v_url  := v_att->>'url';

    if v_kind is null or v_kind not in ('image', 'video', 'file', 'audio') then
      raise exception 'invalid_attachment_kind' using errcode = '22023';
    end if;
    if v_path is null or split_part(v_path, '/', 1) <> v_uid::text then
      raise exception 'attachment_not_owned' using errcode = '42501';
    end if;
    if v_url is null or right(v_url, char_length('/storage/v1/object/public/mint-media/' || v_path))
                        <> '/storage/v1/object/public/mint-media/' || v_path then
      raise exception 'attachment_url_mismatch' using errcode = '22023';
    end if;

    select (o.metadata->>'size')::bigint, o.metadata->>'mimetype'
      into v_size, v_mime
      from storage.objects o
     where o.bucket_id = 'mint-media' and o.name = v_path;
    if not found then
      raise exception 'attachment_not_found' using errcode = 'P0002';
    end if;

    v_limit := case v_kind
                 when 'image' then 10485760    -- 10 MB
                 when 'video' then 104857600   -- 100 MB
                 else              20971520    -- 20 MB (audio, file)
               end;
    if v_size > v_limit then
      raise exception 'attachment_too_large' using errcode = '22023';
    end if;
    -- Some uploads arrive without a content type; only reject a clear mismatch.
    if v_kind <> 'file' and v_mime is not null
       and v_mime <> 'application/octet-stream'
       and split_part(v_mime, '/', 1) <> v_kind then
      raise exception 'attachment_type_mismatch' using errcode = '22023';
    end if;

    -- Thumbnails are stored next to the file, never an outside URL.
    v_thumb_path := nullif(v_att->>'thumbnail_path', '');
    if v_thumb_path is not null and split_part(v_thumb_path, '/', 1) <> v_uid::text then
      raise exception 'attachment_not_owned' using errcode = '42501';
    end if;
    v_base := left(v_url, char_length(v_url) - char_length(v_path));

    insert into content.post_attachments (
      post_id, position, kind, storage_path, url, file_name, mime_type,
      size_bytes, duration_seconds, width, height, thumbnail_url
    ) values (
      v_post.id, v_pos, v_kind, v_path, v_url,
      left(nullif(v_att->>'file_name', ''), 255),
      v_mime, v_size,
      (v_att->>'duration_seconds')::numeric,
      (v_att->>'width')::integer,
      (v_att->>'height')::integer,
      case when v_thumb_path is not null then v_base || v_thumb_path end
    );
    v_pos := v_pos + 1;
  end loop;

  if v_poll is not null then
    v_options := v_poll->'options';
    v_hours   := coalesce((v_poll->>'duration_hours')::integer, 24);
    if jsonb_typeof(v_options) <> 'array'
       or jsonb_array_length(v_options) not between 2 and 4 then
      raise exception 'poll_needs_2_to_4_options' using errcode = '22023';
    end if;
    if v_hours not between 1 and 168 then
      raise exception 'poll_duration_out_of_range' using errcode = '22023';
    end if;

    insert into content.polls (post_id, ends_at)
    values (v_post.id, now() + make_interval(hours => v_hours));

    for v_label in select btrim(value) from jsonb_array_elements_text(v_options) loop
      insert into content.poll_options (post_id, position, label)
      values (v_post.id, v_opt_pos, v_label);
      v_opt_pos := v_opt_pos + 1;
    end loop;
  end if;

  return (to_jsonb(v_post) - 'fts')
    || jsonb_build_object(
         'attachments',
         coalesce((select a.attachments from public.attachment_get_for_posts(array[v_post.id]) a), '[]'::jsonb),
         'poll',
         (select to_jsonb(pl) from public.poll_get_for_posts(array[v_post.id]) pl)
       );
end $$;

revoke execute on function public.social_create_post(jsonb)  from public, anon;
revoke execute on function public.poll_vote(bigint, bigint)  from public, anon;
grant  execute on function public.social_create_post(jsonb)  to authenticated, service_role;
grant  execute on function public.poll_vote(bigint, bigint)  to authenticated, service_role;
grant  execute on function public.attachment_get_for_posts(bigint[]) to anon, authenticated, service_role;
grant  execute on function public.poll_get_for_posts(bigint[])       to anon, authenticated, service_role;

commit;

notify pgrst, 'reload schema';
