begin;

alter table public.applications
  drop constraint if exists applications_stage_check;

update public.applications
set stage = 'Interview 1'
where stage = 'Interview';

alter table public.applications
  add constraint applications_stage_check
  check (
    stage in (
      'Applied',
      'Assessment',
      'Recruiter screen',
      'Interview 1',
      'Interview 2',
      'Interview 3',
      'Interview 4+',
      'Offer'
    )
  );

commit;
