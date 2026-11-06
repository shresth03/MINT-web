-- Stop exposing every account's email address.
--
-- identity.profiles carried a copy of auth.users.email. Profiles are readable
-- by everyone ("Public read users", role public, using true), and five public
-- functions return whole profile rows to anon: profile_get_by_id,
-- profile_get_by_ids, profile_get_by_username, profile_update and
-- search_profiles_query. So any logged-out visitor could list all emails.
--
-- Nothing needs the copy: the admin functions already read auth.users.email
-- and show it to admins only, neither app reads email from a profile, and on
-- 2026-11-06 every profile email matched auth.users exactly, so dropping the
-- column loses nothing.

-- New-user triggers stop writing the column. Same behaviour otherwise.
create or replace function identity.profile_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
begin
  insert into identity.profiles (id, username, role, score, aura_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'public', 0, 0
  ) on conflict (id) do nothing;
  return new;
end;
$function$;

-- Not attached to any trigger today; kept in step so it can't bring the
-- column back if someone attaches it.
create or replace function identity.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $function$
begin
  insert into identity.profiles (id, username, role, score, aura_points)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'public', 0, 0
  ) on conflict (id) do nothing;
  return new;
end;
$function$;

-- The only object that depends on the column. No grants to anon or
-- authenticated, and neither app reads it; recreated without email.
drop view if exists identity.v_profiles;

alter table identity.profiles drop column email;

create view identity.v_profiles with (security_invoker = true) as
  select id, username, role, score, created_at, aura_points
  from identity.profiles;
