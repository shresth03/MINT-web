-- News review queue, a blocked-terms list, and a removed-posts list for
-- moderators.
--
--   1. 'pending' posts: held for an admin (News posts the AI isn't sure
--      about). Hidden from everyone but the author and staff until reviewed.
--      mod_review_post approves (-> visible) or rejects (-> removed).
--   2. moderation.blocked_terms: checked on every post insert and body edit,
--      web and mobile alike. Matching is case-insensitive on word
--      boundaries after normalising punctuation, spacing ("b a d", "b.a.d")
--      and common substitutions ("w0rd", "@", "$", "sh!t").
--   3. mod_get_removed_posts: removed posts with who removed them, why, when
--      and where from (review / moderator / reports). Restore stays
--      mod_restore_post.
--   4. Notification types for the review flow.

begin;

-- ─── 1. Pending status ─────────────────────────────────────────────────────

alter table content.posts drop constraint posts_moderation_status_chk;
alter table content.posts add constraint posts_moderation_status_chk
  check (moderation_status = any (array['visible', 'limited', 'under_review', 'pending', 'removed']));

drop policy if exists posts_hide_deleted_removed on content.posts;
create policy posts_hide_deleted_removed on content.posts
  as restrictive for select to anon, authenticated
  using (
    ((deleted_at is null) and (moderation_status not in ('removed', 'pending')))
    or ((deleted_at is null) and (author_id = (select auth.uid())))
    or (select admin.is_staff())
  );

create or replace function content.can_view_post(p_post_id bigint, p_uid uuid default auth.uid())
returns boolean
language sql
stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from content.posts p
    where p.id = p_post_id and p.deleted_at is null
      and (p.moderation_status not in ('removed', 'pending')
           or p.author_id = p_uid or admin.is_staff(p_uid)))
$$;

alter table social.notifications drop constraint notifications_type_check;
alter table social.notifications add constraint notifications_type_check
  check (type = any (array[
    'like', 'reply', 'repost', 'follow', 'mention', 'message', 'score_override',
    'post_pending_review', 'post_approved', 'post_rejected'
  ]));

-- Approve or reject a post waiting for review. Rejecting removes it (the
-- author still sees it, marked removed) and it shows in the removed list.
create or replace function public.mod_review_post(p_post_id bigint, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := admin.require_staff();
  v_author uuid;
begin
  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = '22023';
  end if;

  update content.posts
     set moderation_status = case when p_approve then 'visible' else 'removed' end,
         moderation_reason = case when p_approve then null else p_reason end
   where id = p_post_id and moderation_status = 'pending' and deleted_at is null
  returning author_id into v_author;
  if not found then
    raise exception 'post_not_pending' using errcode = 'P0002';
  end if;

  insert into social.notifications (to_user_id, from_user_id, type, post_id)
  values (v_author, v_uid,
          case when p_approve then 'post_approved' else 'post_rejected' end,
          p_post_id);

  perform admin.write_audit(
    case when p_approve then 'post_review_approve' else 'post_review_reject' end,
    'post', p_post_id::text, p_reason);
end $$;

-- ─── 2. Blocked terms ──────────────────────────────────────────────────────

create or replace function moderation.normalize_text(p_text text)
returns text
language sql
immutable parallel safe
set search_path = ''
as $$
  select btrim(
    -- "b a d" -> "bad": join runs of single characters
    regexp_replace(
      -- punctuation and whitespace -> one space
      regexp_replace(
        -- "sh!t", "l|ar" -> i, but not a trailing "!"
        regexp_replace(
          translate(lower(coalesce(p_text, '')), '013457@$', 'oieastas'),
          '[!|](?=[[:alpha:]])', 'i', 'g'),
        '[[:punct:][:space:]]+', ' ', 'g'),
      '\m(\w) (?=\w\M)', '\1', 'g'))
$$;

create table moderation.blocked_terms (
  id         bigint generated always as identity primary key,
  term       text not null check (char_length(btrim(term)) between 1 and 100),
  normalized text generated always as (moderation.normalize_text(term)) stored,
  reason     text check (char_length(reason) <= 200),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (normalized <> '')
);

create unique index blocked_terms_normalized_key on moderation.blocked_terms (normalized);

alter table moderation.blocked_terms enable row level security;
revoke all on moderation.blocked_terms from anon, authenticated;
grant all on moderation.blocked_terms to service_role;

-- First entry the text contains, or no row.
create or replace function moderation.find_blocked_term(p_text text)
returns moderation.blocked_terms
language sql
stable security definer
set search_path = ''
as $$
  select b.*
  from moderation.blocked_terms b
  where ' ' || moderation.normalize_text(p_text) || ' ' like '% ' || b.normalized || ' %'
  order by b.id
  limit 1
$$;

create or replace function content.block_blocked_terms()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hit moderation.blocked_terms;
begin
  if coalesce(current_setting('app.system_write', true), 'off') = 'on' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.body is not distinct from old.body then
    return new;
  end if;
  v_hit := moderation.find_blocked_term(new.body);
  if v_hit.id is not null then
    raise exception 'blocked_content'
      using errcode = '22023',
            detail = coalesce(nullif(v_hit.reason, ''), 'This post contains blocked content.');
  end if;
  return new;
end $$;

create trigger posts_block_blocked_terms
  before insert or update of body on content.posts
  for each row execute function content.block_blocked_terms();

-- Lets a composer warn before posting. Returns the reason only, never the
-- term, so the list can't be read back one probe at a time.
create or replace function public.check_blocked_text(p_text text)
returns table (reason text)
language sql
stable security definer
set search_path = ''
as $$
  select coalesce(nullif(b.reason, ''), 'This post contains blocked content.')
  from moderation.find_blocked_term(p_text) b
  where b.id is not null
$$;

create or replace function public.mod_blocklist_get()
returns table (
  id bigint, term text, reason text, created_at timestamptz,
  created_by uuid, created_by_username text
)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform admin.require_staff();
  return query
    select b.id, b.term, b.reason, b.created_at, b.created_by, pr.username
    from moderation.blocked_terms b
    left join identity.profiles pr on pr.id = b.created_by
    order by b.created_at desc;
end $$;

create or replace function public.mod_blocklist_add(p_term text, p_reason text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := admin.require_staff();
  v_id  bigint;
begin
  if nullif(moderation.normalize_text(p_term), '') is null then
    raise exception 'empty_content' using errcode = '22023';
  end if;
  insert into moderation.blocked_terms (term, reason, created_by)
  values (btrim(p_term), nullif(btrim(p_reason), ''), v_uid)
  on conflict (normalized) do nothing
  returning id into v_id;
  if v_id is null then
    raise exception 'term_already_blocked' using errcode = '23505';
  end if;
  perform admin.write_audit('blocklist_add', 'blocked_term', v_id::text, p_reason,
                            jsonb_build_object('term', btrim(p_term)));
  return v_id;
end $$;

create or replace function public.mod_blocklist_remove(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_term text;
begin
  perform admin.require_staff();
  delete from moderation.blocked_terms where id = p_id returning term into v_term;
  if not found then
    raise exception 'term_not_found' using errcode = 'P0002';
  end if;
  perform admin.write_audit('blocklist_remove', 'blocked_term', p_id::text, null,
                            jsonb_build_object('term', v_term));
end $$;

-- ─── 3. Removed posts ──────────────────────────────────────────────────────

-- p_source: null for all, or 'review' | 'moderator' | 'reports'.
-- Removals from before the audit log existed show as 'moderator' with no
-- removed_by / removed_at.
create or replace function public.mod_get_removed_posts(p_source text default null, p_limit integer default 100)
returns table (
  post_id bigint, author_id uuid, author_username text, body text,
  media_url text, post_type text, created_at timestamptz,
  removed_at timestamptz, removed_by uuid, removed_by_username text,
  reason text, source text
)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform admin.require_staff();
  if p_source is not null and p_source not in ('review', 'moderator', 'reports') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;
  return query
    with removed as (
      select p.*,
             a.created_at as audit_at, a.actor_id, a.action,
             case
               when a.action = 'post_review_reject' then 'review'
               when exists (
                 select 1 from moderation.reports r
                 where r.target_type = 'post' and r.target_id = p.id::text
                   and r.resolution_action = 'remove_post') then 'reports'
               else 'moderator'
             end as src
      from content.posts p
      left join lateral (
        select l.created_at, l.actor_id, l.action
        from admin.audit_log l
        where l.target_type = 'post' and l.target_id = p.id::text
          and l.action in ('post_remove', 'post_review_reject', 'post_visibility_removed')
        order by l.created_at desc
        limit 1
      ) a on true
      where p.moderation_status = 'removed' and p.deleted_at is null
    )
    select r.id, r.author_id, au.username, r.body, r.media_url, r.post_type,
           r.created_at, r.audit_at, r.actor_id, mo.username,
           r.moderation_reason, r.src
    from removed r
    left join identity.profiles au on au.id = r.author_id
    left join identity.profiles mo on mo.id = r.actor_id
    where p_source is null or r.src = p_source
    order by coalesce(r.audit_at, r.created_at) desc
    limit least(coalesce(p_limit, 100), 500);
end $$;

-- Posts waiting for review, oldest first.
create or replace function public.mod_get_pending_posts(p_limit integer default 100)
returns table (
  post_id bigint, author_id uuid, author_username text, author_role text,
  body text, media_url text, post_type text, created_at timestamptz
)
language plpgsql
stable security definer
set search_path = ''
as $$
begin
  perform admin.require_staff();
  return query
    select p.id, p.author_id, pr.username, pr.role, p.body, p.media_url,
           p.post_type, p.created_at
    from content.posts p
    left join identity.profiles pr on pr.id = p.author_id
    where p.moderation_status = 'pending' and p.deleted_at is null
    order by p.created_at
    limit least(coalesce(p_limit, 100), 500);
end $$;

-- ─── 4. social_create_post: allow 'pending' and notify the author ─────────

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
  -- The author may hold their own post back: 'pending' waits for an admin
  -- (News review, hidden until approved); 'under_review' stays visible.
  if p_payload->>'moderation_status' in ('pending', 'under_review') then
    v_status := p_payload->>'moderation_status';
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

  if v_status = 'pending' then
    insert into social.notifications (to_user_id, from_user_id, type, post_id)
    values (v_uid, v_uid, 'post_pending_review', v_post.id);
  end if;

  return (to_jsonb(v_post) - 'fts')
    || jsonb_build_object(
         'attachments',
         coalesce((select a.attachments from public.attachment_get_for_posts(array[v_post.id]) a), '[]'::jsonb),
         'poll',
         (select to_jsonb(pl) from public.poll_get_for_posts(array[v_post.id]) pl)
       );
end $$;


revoke execute on function public.mod_review_post(bigint, boolean, text)  from public, anon;
revoke execute on function public.mod_blocklist_get()                      from public, anon;
revoke execute on function public.mod_blocklist_add(text, text)            from public, anon;
revoke execute on function public.mod_blocklist_remove(bigint)             from public, anon;
revoke execute on function public.mod_get_removed_posts(text, integer)     from public, anon;
revoke execute on function public.mod_get_pending_posts(integer)           from public, anon;
revoke execute on function public.check_blocked_text(text)                 from public, anon;
revoke execute on function moderation.find_blocked_term(text)              from public, anon, authenticated;
grant  execute on function public.mod_review_post(bigint, boolean, text)  to authenticated, service_role;
grant  execute on function public.mod_blocklist_get()                      to authenticated, service_role;
grant  execute on function public.mod_blocklist_add(text, text)            to authenticated, service_role;
grant  execute on function public.mod_blocklist_remove(bigint)             to authenticated, service_role;
grant  execute on function public.mod_get_removed_posts(text, integer)     to authenticated, service_role;
grant  execute on function public.mod_get_pending_posts(integer)           to authenticated, service_role;
grant  execute on function public.check_blocked_text(text)                 to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
