-- A message remains available to the other participant when one user removes it.
-- Existing rows intentionally remain null; application reads treat null as false.
alter table public.messages
  add column if not exists deleted_by_sender boolean,
  add column if not exists deleted_by_receiver boolean;

-- Defaults affect future inserts only and do not update existing message rows.
alter table public.messages
  alter column deleted_by_sender set default false,
  alter column deleted_by_receiver set default false;
