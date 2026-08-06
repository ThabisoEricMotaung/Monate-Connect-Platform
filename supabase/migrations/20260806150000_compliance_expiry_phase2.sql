-- Phase 2: compliance-expiry monitoring -- idempotency ledger for 30/14/1
-- day reminders, and a system-clock expiry sweep for the Passport tables
-- (mirrors expire_verification_attestations: a time transition, not a human
-- review decision, so it does not route through a review/attestation RPC).

create table public.compliance_expiry_notifications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  record_type text not null check (
    record_type in ('supplier_document', 'supplier_certification', 'supplier_licence', 'contract')
  ),
  record_id uuid not null,
  window_days integer not null check (window_days in (30, 14, 1)),
  notified_for_date date not null,
  sent_at timestamptz not null default now(),
  unique (record_type, record_id, window_days, notified_for_date)
);

create index compliance_expiry_notifications_profile_idx
  on public.compliance_expiry_notifications (profile_id);

alter table public.compliance_expiry_notifications enable row level security;

-- Admin/reviewer sessions need read+write here too: the contract-renewals
-- page calls notifyContractExpiring() (which checks/records this table)
-- directly from the browser under the admin's own session, the same as its
-- existing contract/notification writes -- this is not a supplier-facing
-- table, so no supplier policy exists.
create policy "Admins and reviewers manage compliance expiry notifications"
  on public.compliance_expiry_notifications
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and lower(trim(coalesce(reviewer.role, ''))) in ('admin', 'reviewer')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and lower(trim(coalesce(reviewer.role, ''))) in ('admin', 'reviewer')
    )
  );

revoke all on public.compliance_expiry_notifications from public, anon;
grant select, insert on public.compliance_expiry_notifications to authenticated;
grant all on public.compliance_expiry_notifications to service_role;

create or replace function public.expire_supplier_passport_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cert public.supplier_certifications%rowtype;
  v_licence public.supplier_licences%rowtype;
  v_cert_count integer := 0;
  v_licence_count integer := 0;
begin
  for v_cert in
    select *
    from public.supplier_certifications
    where status = 'Verified'
      and expiry_date is not null
      and expiry_date < current_date
    order by id
    for update skip locked
  loop
    update public.supplier_certifications
    set status = 'Expired'
    where id = v_cert.id;

    insert into public.audit_logs (
      user_id, user_email, action, entity_type, entity_id,
      old_values, new_values, metadata, created_at
    )
    values (
      null, null, 'supplier_certification.expired', 'supplier_certification', v_cert.id::text,
      to_jsonb(v_cert), jsonb_build_object('status', 'Expired'), jsonb_build_object('profile_id', v_cert.profile_id), now()
    );

    v_cert_count := v_cert_count + 1;
  end loop;

  for v_licence in
    select *
    from public.supplier_licences
    where status = 'Verified'
      and expiry_date is not null
      and expiry_date < current_date
    order by id
    for update skip locked
  loop
    update public.supplier_licences
    set status = 'Expired'
    where id = v_licence.id;

    insert into public.audit_logs (
      user_id, user_email, action, entity_type, entity_id,
      old_values, new_values, metadata, created_at
    )
    values (
      null, null, 'supplier_licence.expired', 'supplier_licence', v_licence.id::text,
      to_jsonb(v_licence), jsonb_build_object('status', 'Expired'), jsonb_build_object('profile_id', v_licence.profile_id), now()
    );

    v_licence_count := v_licence_count + 1;
  end loop;

  return jsonb_build_object('certifications_expired', v_cert_count, 'licences_expired', v_licence_count);
end;
$$;

revoke execute on function public.expire_supplier_passport_records() from public, anon, authenticated;
grant execute on function public.expire_supplier_passport_records() to service_role;
