create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  company text not null check (char_length(trim(company)) between 1 and 200),
  role text not null check (char_length(trim(role)) between 1 and 250),
  stage text not null check (
    stage in ('Applied', 'Assessment', 'Recruiter screen', 'Interview', 'Offer')
  ),
  outcome text not null check (
    outcome in ('Active', 'Rejected', 'Offer', 'Withdrawn')
  ),
  applied_at date not null,
  response_at date,
  source text check (source is null or char_length(source) <= 200),
  location text check (location is null or char_length(location) <= 200),
  job_url text check (job_url is null or char_length(job_url) <= 2000),
  legacy_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, legacy_id)
);

create index applications_user_applied_at_idx
  on public.applications (user_id, applied_at desc);

alter table public.applications enable row level security;

revoke all on table public.applications from anon, authenticated;
grant select, insert, update, delete on table public.applications to authenticated;

create policy "Users can read their own applications"
  on public.applications
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own applications"
  on public.applications
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own applications"
  on public.applications
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own applications"
  on public.applications
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();
