-- social_create_post capped the body at 500 characters (the web composer's
-- limit), but the mobile composer allows 2000, so longer mobile posts were
-- rejected. Raise the cap to 2000; the web composer keeps its own 500 limit.
-- Body unchanged apart from that check.

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
  if char_length(v_body) > 2000 then
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

notify pgrst, 'reload schema';
