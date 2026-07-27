-- The "families: members can read" policy only lets a user read a family row
-- once their profile is already linked to it, which makes it impossible to
-- resolve an invite code to a family before joining. This function runs as
-- security definer to look up a family by invite code regardless of RLS,
-- while only ever exposing the id/name (never other family data).
create or replace function public.find_family_by_invite_code(code text)
returns table (id uuid, name text)
language sql
security definer
set search_path = public
as $$
  select id, name from families where invite_code = code;
$$;

grant execute on function public.find_family_by_invite_code(text) to authenticated;
