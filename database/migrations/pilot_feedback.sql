create table if not exists pilot_feedback (
  id bigint generated always as identity primary key,
  tester_name text,
  tester_role text,
  page_or_feature text,
  feedback_type text,
  rating integer,
  message text,
  priority text default 'Normal',
  status text default 'New',
  created_at timestamptz default timezone('utc', now())
);

alter table pilot_feedback enable row level security;

drop policy if exists "Insert pilot feedback" on pilot_feedback;
create policy "Insert pilot feedback"
on pilot_feedback
for insert
with check (true);

drop policy if exists "Read pilot feedback" on pilot_feedback;
create policy "Read pilot feedback"
on pilot_feedback
for select
using (true);

create index if not exists pilot_feedback_status_idx
on pilot_feedback (status);

create index if not exists pilot_feedback_created_at_idx
on pilot_feedback (created_at desc);
