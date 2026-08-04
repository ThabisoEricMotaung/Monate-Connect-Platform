begin;

alter table public.profiles
  add column if not exists registration_status text not null default 'draft',
  add column if not exists registration_completed_at timestamptz,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists intended_role text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_registration_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_registration_status_check
      check (registration_status in ('draft', 'complete'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_intended_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_intended_role_check
      check (intended_role is null or intended_role in ('supplier', 'buyer'));
  end if;
end
$$;

comment on column public.profiles.registration_status is
  'Durable registration gate. Draft profiles may remain sparse; complete profiles passed a role-specific contract or an explicitly audited legacy backfill.';
comment on column public.profiles.registration_completed_at is
  'When the role-specific registration contract was completed or an existing account was explicitly grandfathered.';
comment on column public.profiles.terms_accepted_at is
  'Persisted acceptance time for the current registration terms. Null on legacy accounts where the old browser-only checkbox left no durable evidence.';
comment on column public.profiles.intended_role is
  'Server-controlled role selected before an OAuth round-trip; not an authorization source until registration completes.';

create index if not exists profiles_registration_status_role_idx
  on public.profiles (registration_status, role)
  where coalesce(is_deleted, false) = false;

update public.profiles
set intended_role = lower(btrim(role))
where intended_role is null
  and lower(btrim(coalesce(role, ''))) in ('supplier', 'buyer');

update public.profiles
set first_name = coalesce(nullif(btrim(first_name), ''), 'Tshinondiwa'),
    last_name = coalesce(nullif(btrim(last_name), ''), 'Phungo')
where id = '2d90a5d9-2090-46c3-b96d-7ae1c76bee16'
  and lower(email) = 'mukonisiholdings@gmail.com';

update public.profiles
set registration_status = 'complete',
    registration_completed_at = coalesce(registration_completed_at, timezone('utc', now()))
where lower(btrim(coalesce(role, ''))) = 'admin'
  and coalesce(is_deleted, false) = false;

update public.profiles
set registration_status = 'complete',
    registration_completed_at = coalesce(registration_completed_at, timezone('utc', now()))
where lower(btrim(coalesce(role, ''))) = 'supplier'
  and coalesce(is_deleted, false) = false
  and lower(coalesce(email, '')) <> 'aiformprocure@gmail.com'
  and nullif(btrim(coalesce(first_name, full_name, '')), '') is not null
  and nullif(btrim(coalesce(last_name, full_name, '')), '') is not null
  and nullif(btrim(coalesce(business_name, '')), '') is not null
  and nullif(btrim(coalesce(company_registration, '')), '') is not null
  and nullif(btrim(coalesce(phone, '')), '') is not null
  and nullif(btrim(coalesce(industry, '')), '') is not null
  and (
    coalesce(cardinality(provinces), 0) > 0
    or nullif(btrim(coalesce(province, '')), '') is not null
  )
  and nullif(btrim(coalesce(csd_number, '')), '') is not null
  and nullif(btrim(coalesce(bbbee_level, '')), '') is not null;

update public.profiles p
set registration_status = 'complete',
    registration_completed_at = coalesce(p.registration_completed_at, timezone('utc', now()))
from public.buyer_profiles bp
where bp.user_id = p.id
  and lower(btrim(coalesce(p.role, ''))) = 'buyer'
  and coalesce(p.is_deleted, false) = false
  and nullif(btrim(coalesce(bp.procurement_contact, p.full_name, '')), '') is not null
  and nullif(btrim(coalesce(bp.organisation_name, '')), '') is not null
  and nullif(btrim(coalesce(bp.procurement_phone, p.phone, '')), '') is not null
  and nullif(btrim(coalesce(bp.organisation_type, bp.industry, '')), '') is not null
  and nullif(btrim(coalesce(bp.province, '')), '') is not null;

insert into public.audit_logs (
  user_id, user_email, action, entity_type, entity_id,
  old_values, new_values, metadata
)
select
  null,
  p.email,
  'registration.backfill_classified',
  'profile',
  p.id::text,
  jsonb_build_object('registration_status', null),
  jsonb_build_object(
    'registration_status', p.registration_status,
    'registration_completed_at', p.registration_completed_at,
    'terms_accepted_at', p.terms_accepted_at,
    'intended_role', p.intended_role
  ),
  jsonb_build_object(
    'migration', 'registration_completion_state',
    'legacy_terms_evidence', false,
    'classification', case
      when lower(coalesce(p.email, '')) = 'aiformprocure@gmail.com' then 'internal_account_excluded_pending_role_decision'
      when p.registration_status = 'complete' and lower(coalesce(p.role, '')) = 'admin' then 'admin_exempt'
      when p.registration_status = 'complete' then 'legacy_contract_complete'
      else 'completion_required'
    end
  )
from public.profiles p
where coalesce(p.is_deleted, false) = false
  and not exists (
    select 1 from public.audit_logs a
    where a.action = 'registration.backfill_classified'
      and a.entity_type = 'profile'
      and a.entity_id = p.id::text
      and a.metadata ->> 'migration' = 'registration_completion_state'
  );

commit;;
