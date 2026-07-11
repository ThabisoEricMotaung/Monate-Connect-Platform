-- Track when each participant moves a message to Recently Deleted.
-- The retention purge only permanently deletes messages after both sides have
-- deleted their copy and both deletion timestamps are older than 30 days.
alter table public.messages
  add column if not exists deleted_by_sender_at timestamptz,
  add column if not exists deleted_by_receiver_at timestamptz;

comment on column public.messages.deleted_by_sender_at is
  'Timestamp when the sender soft-deleted their copy; used for 30-day retention purge.';

comment on column public.messages.deleted_by_receiver_at is
  'Timestamp when the receiver soft-deleted their copy; used for 30-day retention purge.';
