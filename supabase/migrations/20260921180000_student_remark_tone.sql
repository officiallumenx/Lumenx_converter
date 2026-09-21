-- Add sentiment tone for student remarks (independent of remark_type category).
alter table public.student_remark
  add column if not exists tone text not null default 'none';

alter table public.student_remark
  drop constraint if exists student_remark_tone_check;

alter table public.student_remark
  add constraint student_remark_tone_check
  check (tone in ('good', 'bad', 'none'));

comment on column public.student_remark.tone is
  'Teacher sentiment: good | bad | none (display for parents; category stays in remark_type).';
