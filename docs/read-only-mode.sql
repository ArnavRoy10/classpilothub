-- ClassPilot: view-only mode for organisations that are suspended (trial/plan ended + 4 days unpaid).
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Mirrors computeBillingState() in lib/billing-state.ts (14-day trial, 4-day grace).

create or replace function public.organization_is_suspended(org uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  s record;
  overdue_since timestamptz;
begin
  select status, trial_end, current_period_end into s
  from public.subscriptions where organization_id = org;
  if not found then return false; end if;

  if s.status = 'active' and s.current_period_end is null then return false; end if;
  if s.status in ('active', 'canceled') and s.current_period_end is not null and now() <= s.current_period_end then return false; end if;
  if s.trial_end is not null and now() <= s.trial_end then return false; end if;
  if s.trial_end is null and s.current_period_end is null then return false; end if;

  overdue_since := greatest(s.trial_end, s.current_period_end); -- greatest() ignores nulls
  return now() >= overdue_since + interval '4 days';
end;
$$;

-- Blocks writes made from the browser (signed-in users). The server (service role, e.g. the
-- Razorpay webhook that records a payment) is not affected, so paying still works.
create or replace function public.block_writes_when_suspended()
returns trigger
language plpgsql
as $$
declare
  org uuid;
begin
  if current_user not in ('authenticated', 'anon') then
    if TG_OP = 'DELETE' then return old; else return new; end if;
  end if;

  if TG_OP = 'DELETE' then
    org := (to_jsonb(old) ->> 'organization_id')::uuid;
  else
    org := (to_jsonb(new) ->> 'organization_id')::uuid;
  end if;

  if org is not null and public.organization_is_suspended(org) then
    raise exception 'Your organisation is in view-only mode because of an unpaid bill.';
  end if;

  if TG_OP = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Attach it to every table that has an organization_id column, except billing / account tables.
do $$
declare t record;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public'
      and c.column_name = 'organization_id'
      and c.table_name not in ('organizations', 'subscriptions', 'profiles', 'notifications')
      and c.table_name not like 'billing%'
      and c.table_name not like '%event%'
      and c.table_name not like '%log%'
      and c.table_name not like '%session%'
  loop
    execute format('drop trigger if exists block_writes_when_suspended on public.%I', t.table_name);
    execute format(
      'create trigger block_writes_when_suspended before insert or update or delete on public.%I for each row execute function public.block_writes_when_suspended()',
      t.table_name
    );
  end loop;
end $$;

-- Check: which tables are protected?
select event_object_table as protected_table
from information_schema.triggers
where trigger_name = 'block_writes_when_suspended'
group by 1 order by 1;
