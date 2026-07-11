create table if not exists public.thuso_feedback (
  id bigint generated always as identity primary key,
  rating text not null check (rating in ('helpful', 'not_helpful')),
  detail text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.thuso_feedback enable row level security;

create index if not exists thuso_feedback_created_at_idx
on public.thuso_feedback (created_at desc);
