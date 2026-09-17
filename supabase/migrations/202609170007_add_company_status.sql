alter table public.applications
  add column if not exists company_status text;
