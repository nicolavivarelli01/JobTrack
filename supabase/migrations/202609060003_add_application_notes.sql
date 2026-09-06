alter table public.applications
  add column if not exists notes text
  check (notes is null or char_length(notes) <= 5000);
