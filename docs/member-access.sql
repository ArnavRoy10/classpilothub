-- ClassPilot: role-based logins (Student / Teacher / Owner) and per-member permissions.
-- Run ONCE in the Supabase SQL editor, BEFORE deploying the new code. Safe to re-run.
--
-- ASSUMPTIONS to verify: public.profiles already has id, organization_id, full_name, email,
-- role and student_id columns (the current code already reads them).

-- 1. Which login option a person uses, and what the owner allowed them to do.
alter table public.profiles add column if not exists member_type text;
alter table public.profiles add column if not exists permissions jsonb not null default '{}'::jsonb;

-- 2. Backfill existing people from their current role.
update public.profiles set member_type = case
  when role in ('owner', 'admin') then 'owner'
  when role = 'teacher' then 'teacher'
  when role in ('student', 'parent') then 'student'
end
where member_type is null;

-- 3. If profiles.role has a CHECK constraint, it must allow 'admin' and 'teacher'. Inspect it:
--    select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'c';

-- 4. SECURITY: stop signed-in users from promoting themselves. Without this, anyone whose
--    row-level-security allows updating their own profile could set role = 'owner' from the browser.
--    The server (service role) and security-definer functions are unaffected.
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if new.role is distinct from old.role
       or new.member_type is distinct from old.member_type
       or new.permissions is distinct from old.permissions
       or new.organization_id is distinct from old.organization_id
       or new.student_id is distinct from old.student_id then
      raise exception 'You cannot change role, permissions or organisation yourself.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
before update on public.profiles
for each row execute function public.protect_profile_privileges();

-- 5. Check: every person should now have a member_type.
select role, member_type, count(*) from public.profiles group by 1, 2 order by 1, 2;
