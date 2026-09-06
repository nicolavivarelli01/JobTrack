alter table public.applications
  add column if not exists interview_at timestamptz,
  add column if not exists interview_link text
    check (interview_link is null or char_length(interview_link) <= 2000),
  add column if not exists interview_details text
    check (interview_details is null or char_length(interview_details) <= 5000);

create index if not exists applications_user_interview_at_idx
  on public.applications (user_id, interview_at)
  where interview_at is not null;
