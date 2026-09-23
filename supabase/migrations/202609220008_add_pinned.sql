alter table public.applications
  add column if not exists pinned boolean not null default false;
