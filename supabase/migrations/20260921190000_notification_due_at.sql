-- Notification due_at for deadline presentation (does not change business due dates).
alter table public.notification
  add column if not exists due_at timestamptz;

create index if not exists notification_institute_due_at_idx
  on public.notification (institute_id, due_at)
  where deleted_at is null and due_at is not null;

comment on column public.notification.due_at is
  'Optional deadline used only for notification priority presentation.';
