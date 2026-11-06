-- Username availability for sign-up, and case-insensitive usernames.
--
-- Sign-up runs before there is a session, so the check has to work for anon.
-- profile_get_by_username returns whole profile rows (email included), so it
-- must not be the thing sign-up calls; this function returns a boolean only.
--
-- "Shresth" and "shresth" used to be able to coexist because the unique index
-- on identity.profiles.username is case-sensitive. No such pairs exist today
-- (checked 2026-11-06), so a unique index on lower(username) can go straight in.

create unique index if not exists profiles_username_lower_key
  on identity.profiles (lower(username));

create or replace function public.auth_username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select nullif(btrim(p_username), '') is not null
     and not exists (
       select 1 from identity.profiles
        where lower(username) = lower(btrim(p_username))
     );
$$;

revoke all on function public.auth_username_available(text) from public;
grant execute on function public.auth_username_available(text) to anon, authenticated;
