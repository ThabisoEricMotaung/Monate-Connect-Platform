-- Allow PayFast ITN retries to be logged distinctly when an already accepted
-- transaction is replayed and skipped before reprocessing.

alter table if exists public.payfast_itn_logs
  drop constraint if exists payfast_itn_logs_validation_status_check;

alter table if exists public.payfast_itn_logs
  add constraint payfast_itn_logs_validation_status_check
  check (validation_status in ('received', 'accepted', 'duplicate', 'rejected', 'error'));

drop index if exists public.payfast_itn_logs_payfast_payment_id_status_idx;
drop index if exists public.payfast_itn_logs_merchant_payment_id_status_idx;

create unique index if not exists payfast_itn_logs_one_accepted_pf_payment_id_idx
  on public.payfast_itn_logs (payfast_payment_id)
  where validation_status = 'accepted'
    and payfast_payment_id is not null;

create unique index if not exists payfast_itn_logs_one_accepted_merchant_fallback_idx
  on public.payfast_itn_logs (merchant_payment_id)
  where validation_status = 'accepted'
    and payfast_payment_id is null
    and merchant_payment_id is not null;
