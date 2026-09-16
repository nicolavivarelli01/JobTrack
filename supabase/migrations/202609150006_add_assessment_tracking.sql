alter table public.applications
  add column if not exists had_assessment boolean not null default false;

update public.applications
set had_assessment = true
where stage = 'Assessment'
  and had_assessment = false;
