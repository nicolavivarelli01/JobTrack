alter table public.applications
  add column if not exists rejected_at date;

update public.applications
set rejected_at = coalesce(response_at, applied_at)
where outcome = 'Rejected'
  and rejected_at is null;

create index if not exists applications_user_rejected_at_idx
  on public.applications (user_id, rejected_at)
  where rejected_at is not null;
