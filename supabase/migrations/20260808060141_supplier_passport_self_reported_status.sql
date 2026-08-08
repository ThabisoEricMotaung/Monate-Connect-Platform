-- Passport certifications and licences are informational supplier claims.
-- They do not participate in SmartScore or directory eligibility, and there
-- is no admin review queue for them. Make that provenance explicit and prevent
-- supplier clients from assigning review-only state to their own records.

alter table public.supplier_certifications
  drop constraint if exists supplier_certifications_status_check;

alter table public.supplier_licences
  drop constraint if exists supplier_licences_status_check;

update public.supplier_certifications
set status = case
  when expiry_date is not null and expiry_date < current_date then 'Expired'
  else 'Self-reported'
end
where status = 'Missing';

update public.supplier_licences
set status = case
  when expiry_date is not null and expiry_date < current_date then 'Expired'
  else 'Self-reported'
end
where status = 'Missing';

alter table public.supplier_certifications
  alter column status set default 'Self-reported',
  add constraint supplier_certifications_status_check
    check (status in ('Self-reported', 'Verified', 'Pending review', 'Rejected', 'Expired'));

alter table public.supplier_licences
  alter column status set default 'Self-reported',
  add constraint supplier_licences_status_check
    check (status in ('Self-reported', 'Verified', 'Pending review', 'Rejected', 'Expired'));

create or replace function public.enforce_supplier_passport_self_reported_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  -- RLS establishes ownership. This trigger additionally protects review-only
  -- columns from direct Data API writes made by that supplier.
  if v_user_id is not null and v_user_id = new.profile_id then
    new.status := case
      when new.expiry_date is not null and new.expiry_date < current_date then 'Expired'
      else 'Self-reported'
    end;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

revoke execute on function public.enforce_supplier_passport_self_reported_status()
  from public, anon, authenticated;

drop trigger if exists enforce_supplier_certification_self_reported_status
  on public.supplier_certifications;
create trigger enforce_supplier_certification_self_reported_status
before insert or update on public.supplier_certifications
for each row execute function public.enforce_supplier_passport_self_reported_status();

drop trigger if exists enforce_supplier_licence_self_reported_status
  on public.supplier_licences;
create trigger enforce_supplier_licence_self_reported_status
before insert or update on public.supplier_licences
for each row execute function public.enforce_supplier_passport_self_reported_status();

-- Preserve the existing system-clock expiry transition, now for both genuine
-- reviewed legacy records and active self-reported records.
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
    where status in ('Verified', 'Self-reported')
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
    where status in ('Verified', 'Self-reported')
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

revoke execute on function public.expire_supplier_passport_records()
  from public, anon, authenticated;
grant execute on function public.expire_supplier_passport_records() to service_role;
