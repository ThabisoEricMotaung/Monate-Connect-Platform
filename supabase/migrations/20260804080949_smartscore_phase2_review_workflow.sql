-- SmartScore Phase 2: atomic evidence review and director attestations.

alter table public.supplier_documents
  drop constraint if exists supplier_documents_status_check;

alter table public.supplier_documents
  add constraint supplier_documents_status_check
  check (status in ('under_review', 'verified', 'approved', 'rejected', 'expired', 'superseded'));

create table if not exists public.verification_attestations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  decision text not null,
  reason text,
  evidence_reference text,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint verification_attestations_category_check
    check (category in ('director')),
  constraint verification_attestations_decision_check
    check (decision in ('approved', 'rejected', 'revoked', 'expired')),
  constraint verification_attestations_approval_expiry_check
    check (decision <> 'approved' or expires_at is null or expires_at > reviewed_at)
);

create index if not exists verification_attestations_profile_category_reviewed_idx
  on public.verification_attestations (profile_id, category, reviewed_at desc);

create index if not exists verification_attestations_active_expiry_idx
  on public.verification_attestations (expires_at)
  where decision = 'approved' and expires_at is not null;

alter table public.verification_attestations enable row level security;

drop policy if exists "Suppliers can read own verification attestations" on public.verification_attestations;
create policy "Suppliers can read own verification attestations"
  on public.verification_attestations
  for select
  to authenticated
  using (
    profile_id = (select auth.uid())
    or exists (
      select 1
      from public.profiles reviewer
      where reviewer.id = (select auth.uid())
        and lower(trim(coalesce(reviewer.role, ''))) in ('admin', 'reviewer', 'buyer')
    )
  );

revoke all on public.verification_attestations from public, anon;
grant select on public.verification_attestations to authenticated;
grant all on public.verification_attestations to service_role;

create or replace function public.supplier_compliance_base(p_profile_id uuid)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  with profile_row as (
    select
      p.business_name,
      p.industry,
      p.province,
      p.provinces,
      p.phone,
      p.description,
      p.bbbee_level
    from public.profiles p
    where p.id = p_profile_id
  ),
  latest_documents as (
    select distinct on (d.document_type)
      d.document_type,
      case when lower(trim(d.status)) in ('approved', 'verified') then true else false end as approved
    from public.supplier_documents d
    where d.profile_id = p_profile_id
      and d.status <> 'superseded'
    order by d.document_type, d.uploaded_at desc, d.id desc
  ),
  director as (
    select coalesce((
      select a.decision = 'approved' and (a.expires_at is null or a.expires_at > now())
      from public.verification_attestations a
      where a.profile_id = p_profile_id
        and a.category = 'director'
      order by a.reviewed_at desc, a.id desc
      limit 1
    ), false) as approved
  )
  select
    (case
      when nullif(trim(p.business_name), '') is not null
       and nullif(trim(p.industry), '') is not null
       and (
         nullif(trim(p.province), '') is not null
         or exists (
           select 1
           from unnest(coalesce(p.provinces, '{}'::text[])) province_value
           where nullif(trim(province_value), '') is not null
         )
       )
       and nullif(trim(p.phone), '') is not null
       and nullif(trim(p.description), '') is not null
      then 20 else 0
    end)
    + (case when coalesce((select approved from latest_documents where document_type = 'csd'), false) then 20 else 0 end)
    + (case
        when coalesce((select approved from latest_documents where document_type = 'bbbee'), false)
          and nullif(regexp_replace(coalesce(p.bbbee_level, ''), '[^0-9]', '', 'g'), '')::integer between 1 and 4
        then 20
        when coalesce((select approved from latest_documents where document_type = 'bbbee'), false)
          and nullif(regexp_replace(coalesce(p.bbbee_level, ''), '[^0-9]', '', 'g'), '')::integer between 5 and 8
        then 10
        else 0
      end)
    + (case when coalesce((select approved from latest_documents where document_type = 'tax_clearance'), false) then 15 else 0 end)
    + (case when coalesce((select approved from latest_documents where document_type = 'bank_letter'), false) then 10 else 0 end)
    + (case when (select approved from director) then 10 else 0 end)
    + (case when coalesce((select approved from latest_documents where document_type = 'company_profile'), false) then 5 else 0 end)
  from profile_row p;
$$;

create or replace function public.refresh_supplier_verification(
  p_profile_id uuid,
  p_previous_compliance integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new_compliance integer;
  v_document_approved_count integer;
  v_director_approved boolean;
  v_status text;
  v_score numeric;
begin
  v_new_compliance := coalesce(public.supplier_compliance_base(p_profile_id), 0);

  select count(*)::integer
  into v_document_approved_count
  from (
    select distinct on (d.document_type)
      d.document_type,
      lower(trim(d.status)) in ('approved', 'verified') as approved
    from public.supplier_documents d
    where d.profile_id = p_profile_id
      and d.document_type in ('csd', 'bbbee', 'tax_clearance', 'bank_letter')
      and d.status <> 'superseded'
    order by d.document_type, d.uploaded_at desc, d.id desc
  ) latest
  where latest.approved;

  select coalesce((
    select a.decision = 'approved' and (a.expires_at is null or a.expires_at > now())
    from public.verification_attestations a
    where a.profile_id = p_profile_id
      and a.category = 'director'
    order by a.reviewed_at desc, a.id desc
    limit 1
  ), false)
  into v_director_approved;

  v_status := case
    when v_document_approved_count = 4 and v_director_approved then 'Verified'
    else 'Pending Review'
  end;

  update public.profiles p
  set
    verification_status = v_status,
    smart_score = greatest(
      0,
      least(100, coalesce(p.smart_score, 0)::numeric - coalesce(p_previous_compliance, 0) + v_new_compliance)
    ),
    updated_at = now()
  where p.id = p_profile_id
  returning p.smart_score into v_score;

  return jsonb_build_object(
    'profile_id', p_profile_id,
    'verification_status', v_status,
    'smart_score', v_score,
    'compliance_base', v_new_compliance,
    'approved_document_count', v_document_approved_count,
    'director_approved', v_director_approved
  );
end;
$$;

create or replace function public.review_supplier_document(
  p_document_id uuid,
  p_reviewer_id uuid,
  p_expected_status text,
  p_expected_reviewed_at timestamptz,
  p_decision text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_document public.supplier_documents%rowtype;
  v_reviewer public.profiles%rowtype;
  v_expected text;
  v_current text;
  v_next text;
  v_previous_compliance integer;
  v_refresh jsonb;
begin
  select * into v_reviewer
  from public.profiles
  where id = p_reviewer_id;

  if not found or lower(trim(coalesce(v_reviewer.role, ''))) not in ('admin', 'reviewer') then
    raise exception using errcode = '42501', message = 'Reviewer role required';
  end if;

  select * into v_document
  from public.supplier_documents
  where id = p_document_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Supplier document not found';
  end if;

  -- Serialize all derived-state refreshes for one supplier, even when two
  -- different documents are reviewed concurrently.
  perform 1 from public.profiles where id = v_document.profile_id for update;

  if nullif(trim(coalesce(v_document.file_url, '')), '') is null then
    raise exception using errcode = '22023', message = 'Document evidence is required';
  end if;

  v_current := case when lower(trim(v_document.status)) = 'verified' then 'approved' else lower(trim(v_document.status)) end;
  v_expected := case when lower(trim(p_expected_status)) = 'verified' then 'approved' else lower(trim(p_expected_status)) end;
  v_next := case when lower(trim(p_decision)) = 'verified' then 'approved' else lower(trim(p_decision)) end;

  if v_current <> v_expected or v_document.reviewed_at is distinct from p_expected_reviewed_at then
    raise exception using errcode = '40001', message = 'Stale document review';
  end if;

  if not (
    (v_current = 'under_review' and v_next in ('approved', 'rejected'))
    or (v_current in ('approved', 'rejected') and v_next = 'under_review')
  ) then
    raise exception using errcode = '22023', message = format('Invalid document transition: %s to %s', v_current, v_next);
  end if;

  v_previous_compliance := coalesce(public.supplier_compliance_base(v_document.profile_id), 0);

  update public.supplier_documents
  set
    status = v_next,
    reviewed_at = now(),
    reviewed_by = p_reviewer_id,
    review_notes = nullif(trim(coalesce(p_reason, '')), '')
  where id = p_document_id
  returning * into v_document;

  v_refresh := public.refresh_supplier_verification(v_document.profile_id, v_previous_compliance);

  insert into public.audit_logs (
    user_id,
    user_email,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata,
    created_at
  )
  values (
    p_reviewer_id,
    v_reviewer.email,
    'supplier_document.reviewed',
    'supplier_document',
    p_document_id::text,
    jsonb_build_object('status', v_current, 'reviewed_at', p_expected_reviewed_at),
    jsonb_build_object('status', v_next, 'reviewed_at', v_document.reviewed_at, 'reviewed_by', p_reviewer_id),
    jsonb_build_object('profile_id', v_document.profile_id, 'document_type', v_document.document_type, 'reason', p_reason, 'refresh', v_refresh),
    now()
  );

  return jsonb_build_object(
    'document', to_jsonb(v_document),
    'refresh', v_refresh,
    'audit_created', true
  );
end;
$$;

create or replace function public.review_verification_attestation(
  p_profile_id uuid,
  p_reviewer_id uuid,
  p_category text,
  p_decision text,
  p_reason text,
  p_evidence_reference text,
  p_expires_at timestamptz,
  p_expected_reviewed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer public.profiles%rowtype;
  v_latest public.verification_attestations%rowtype;
  v_attestation public.verification_attestations%rowtype;
  v_previous_compliance integer;
  v_refresh jsonb;
  v_decision text := lower(trim(p_decision));
begin
  select * into v_reviewer from public.profiles where id = p_reviewer_id;
  if not found or lower(trim(coalesce(v_reviewer.role, ''))) not in ('admin', 'reviewer') then
    raise exception using errcode = '42501', message = 'Reviewer role required';
  end if;

  if p_category <> 'director' or v_decision not in ('approved', 'rejected', 'revoked') then
    raise exception using errcode = '22023', message = 'Invalid attestation decision';
  end if;

  if v_decision = 'approved' and p_expires_at is not null and p_expires_at <= now() then
    raise exception using errcode = '22023', message = 'Attestation expiry must be in the future';
  end if;
  if v_decision = 'approved' and nullif(trim(coalesce(p_evidence_reference, '')), '') is null then
    raise exception using errcode = '22023', message = 'Director attestation evidence is required';
  end if;

  perform 1 from public.profiles where id = p_profile_id for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Supplier profile not found';
  end if;

  select * into v_latest
  from public.verification_attestations
  where profile_id = p_profile_id and category = p_category
  order by reviewed_at desc, id desc
  limit 1;

  if v_latest.id is not null and v_latest.reviewed_at is distinct from p_expected_reviewed_at then
    raise exception using errcode = '40001', message = 'Stale attestation review';
  end if;
  if v_latest.id is null and p_expected_reviewed_at is not null then
    raise exception using errcode = '40001', message = 'Stale attestation review';
  end if;

  v_previous_compliance := coalesce(public.supplier_compliance_base(p_profile_id), 0);

  insert into public.verification_attestations (
    profile_id, category, decision, reason, evidence_reference, reviewed_by, reviewed_at, expires_at
  )
  values (
    p_profile_id,
    p_category,
    v_decision,
    nullif(trim(coalesce(p_reason, '')), ''),
    nullif(trim(coalesce(p_evidence_reference, '')), ''),
    p_reviewer_id,
    now(),
    case when v_decision = 'approved' then p_expires_at else null end
  )
  returning * into v_attestation;

  v_refresh := public.refresh_supplier_verification(p_profile_id, v_previous_compliance);

  insert into public.audit_logs (
    user_id, user_email, action, entity_type, entity_id,
    old_values, new_values, metadata, created_at
  )
  values (
    p_reviewer_id,
    v_reviewer.email,
    'verification_attestation.reviewed',
    'verification_attestation',
    v_attestation.id::text,
    case when v_latest.id is null then null else to_jsonb(v_latest) end,
    to_jsonb(v_attestation),
    jsonb_build_object('profile_id', p_profile_id, 'category', p_category, 'refresh', v_refresh),
    now()
  );

  return jsonb_build_object(
    'attestation', to_jsonb(v_attestation),
    'refresh', v_refresh,
    'audit_created', true
  );
end;
$$;

create or replace function public.expire_verification_attestations()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.verification_attestations%rowtype;
  v_previous_compliance integer;
  v_count integer := 0;
begin
  for v_row in
    select a.*
    from public.verification_attestations a
    where a.decision = 'approved'
      and a.expires_at is not null
      and a.expires_at <= now()
      and not exists (
        select 1 from public.verification_attestations newer
        where newer.profile_id = a.profile_id
          and newer.category = a.category
          and (newer.reviewed_at, newer.id) > (a.reviewed_at, a.id)
      )
    order by a.profile_id, a.reviewed_at
    for update skip locked
  loop
    perform 1 from public.profiles where id = v_row.profile_id for update;
    -- supplier_compliance_base already treats a time-expired approval as inactive;
    -- add its former director allocation so the profile score loses those points.
    v_previous_compliance := coalesce(public.supplier_compliance_base(v_row.profile_id), 0) + 10;

    update public.verification_attestations
    set decision = 'expired', reviewed_at = now()
    where id = v_row.id;

    perform public.refresh_supplier_verification(v_row.profile_id, v_previous_compliance);

    insert into public.audit_logs (
      user_id, user_email, action, entity_type, entity_id,
      old_values, new_values, metadata, created_at
    )
    values (
      null, null, 'verification_attestation.expired', 'verification_attestation', v_row.id::text,
      to_jsonb(v_row), jsonb_build_object('decision', 'expired'), jsonb_build_object('profile_id', v_row.profile_id), now()
    );

    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('expired', v_count);
end;
$$;

revoke execute on function public.supplier_compliance_base(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_supplier_verification(uuid, integer) from public, anon, authenticated;
revoke execute on function public.review_supplier_document(uuid, uuid, text, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.review_verification_attestation(uuid, uuid, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.expire_verification_attestations() from public, anon, authenticated;

grant execute on function public.review_supplier_document(uuid, uuid, text, timestamptz, text, text) to service_role;
grant execute on function public.review_verification_attestation(uuid, uuid, text, text, text, text, timestamptz, timestamptz) to service_role;
grant execute on function public.expire_verification_attestations() to service_role;
