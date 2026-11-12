-- Stores the text and colours edited at /founder/site.
-- Only the server (service role) can read or write it: no public access.
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.site_content enable row level security;
-- No policies on purpose.

notify pgrst, 'reload schema';
