alter table pilot_feedback
add column if not exists issue_category text,
add column if not exists admin_notes text,
add column if not exists assigned_to text;

update pilot_feedback
set issue_category = case
  when feedback_type = 'Bug' then 'Bug'
  when feedback_type = 'Confusing' then 'UI Confusion'
  when feedback_type = 'Suggestion' then 'Missing Feature'
  when feedback_type = 'Praise' then 'Positive Feedback'
  else coalesce(issue_category, 'Bug')
end
where issue_category is null;

update pilot_feedback
set priority = case
  when priority = 'Urgent' then 'Critical'
  when priority = 'Normal' then 'Medium'
  when priority in ('Low', 'Medium', 'High', 'Critical') then priority
  else 'Medium'
end;

update pilot_feedback
set status = case
  when status = 'Reviewing' then 'Confirmed'
  when status = 'Planned' then 'In Progress'
  when status in ('New', 'Confirmed', 'In Progress', 'Fixed', 'Won''t Fix', 'Closed') then status
  else 'New'
end;

drop policy if exists "Update pilot feedback" on pilot_feedback;
create policy "Update pilot feedback"
on pilot_feedback
for update
using (true)
with check (true);

create index if not exists pilot_feedback_priority_idx
on pilot_feedback (priority);

create index if not exists pilot_feedback_issue_category_idx
on pilot_feedback (issue_category);

create index if not exists pilot_feedback_tester_role_idx
on pilot_feedback (tester_role);
