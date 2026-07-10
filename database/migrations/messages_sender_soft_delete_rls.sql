-- Fixes: soft-deleting a conversation only ever removed the receiver's copy.
-- Root cause, confirmed live: UPDATE messages SET deleted_by_sender = true
-- WHERE sender_id = auth.uid() affects 0 rows under RLS (no error, silent no-op),
-- while the equivalent deleted_by_receiver update succeeds. No existing UPDATE
-- policy on public.messages grants senders write access to their own rows.
--
-- Effect in the app: any two-way thread (the current user both sent and
-- received messages in it) only has its inbound side removed on delete. The
-- user's own sent messages stay live in "Sent", and the whole thread
-- reassembles in Inbox the next time the other participant replies -
-- reported as "deleted messages reappearing," most visible for admin/buyer
-- accounts since they reply to suppliers far more than they receive-only.
--
-- Safe to re-run: only adds a new, additively-permissive policy (RLS policies
-- for the same command are OR'd together), so this cannot narrow any existing
-- access - it only grants senders the same soft-delete capability receivers
-- already have.

DROP POLICY IF EXISTS "Senders can soft-delete their own sent messages" ON public.messages;

CREATE POLICY "Senders can soft-delete their own sent messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
