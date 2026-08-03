-- Explicitly exempt confirmed internal test/curator identities from the
-- supplier and buyer registration contracts. This does not alter their roles.

begin;

with exempt_accounts(email, exemption_reason) as (
  values
    ('aiformprocure@gmail.com'::text, 'internal_test_account'::text),
    ('aiformprocurator@outlook.com'::text, 'internal_curator_account'::text)
)
update public.profiles p
set registration_status = 'complete',
    registration_completed_at = coalesce(p.registration_completed_at, timezone('utc', now()))
from exempt_accounts e
where lower(p.email) = e.email
  and coalesce(p.is_deleted, false) = false;

with exempt_accounts(email, exemption_reason) as (
  values
    ('aiformprocure@gmail.com'::text, 'internal_test_account'::text),
    ('aiformprocurator@outlook.com'::text, 'internal_curator_account'::text)
)
insert into public.audit_logs (
  user_id,
  user_email,
  action,
  entity_type,
  entity_id,
  old_values,
  new_values,
  metadata
)
select
  null,
  p.email,
  'registration.internal_exemption_applied',
  'profile',
  p.id::text,
  jsonb_build_object('registration_status', 'draft'),
  jsonb_build_object(
    'registration_status', p.registration_status,
    'registration_completed_at', p.registration_completed_at,
    'terms_accepted_at', p.terms_accepted_at,
    'intended_role', p.intended_role
  ),
  jsonb_build_object(
    'migration', 'registration_internal_account_exemptions',
    'classification', 'internal_account_exempt',
    'reason', e.exemption_reason,
    'legacy_terms_evidence', false
  )
from public.profiles p
join exempt_accounts e on lower(p.email) = e.email
where coalesce(p.is_deleted, false) = false
  and not exists (
    select 1
    from public.audit_logs a
    where a.action = 'registration.internal_exemption_applied'
      and a.entity_type = 'profile'
      and a.entity_id = p.id::text
      and a.metadata ->> 'migration' = 'registration_internal_account_exemptions'
  );

commit;
