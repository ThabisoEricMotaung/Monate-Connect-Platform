-- Phase 1: capture and enforce supplier compliance-document expiry dates.
--
-- supplier_documents.expiry_date is the write target going forward (tied to
-- the specific reviewed document row, same reasoning that moved document
-- URLs off flat profile columns). profiles.{csd,bbbee,tax,cidb}_expiry_date
-- remain a legacy read-fallback only -- this migration fixes their type
-- (they were left as text from before the profiles schema was formalized)
-- but nothing writes to them going forward.

alter table public.supplier_documents
  add column if not exists expiry_date date;

alter table public.profiles
  alter column csd_expiry_date type date using nullif(trim(csd_expiry_date), '')::date,
  alter column bbbee_expiry_date type date using nullif(trim(bbbee_expiry_date), '')::date,
  alter column tax_expiry_date type date using nullif(trim(tax_expiry_date), '')::date,
  alter column cidb_expiry_date type date using nullif(trim(cidb_expiry_date), '')::date;

-- supplier_compliance_base: an approved csd/bbbee/tax_clearance document that
-- has passed its expiry_date no longer counts toward the score. Banking
-- (bank_letter) has no expiry concept and is excluded, same as company
-- profile / director attestation.
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
      case
        when lower(trim(d.status)) in ('approved', 'verified')
         and (
           d.document_type not in ('csd', 'bbbee', 'tax_clearance')
           or d.expiry_date is null
           or d.expiry_date >= current_date
         )
        then true
        else false
      end as approved
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

-- review_supplier_document gains an optional p_expiry_date. Adding a
-- parameter changes the function's argument signature, so the old overload
-- must be dropped explicitly or it would coexist alongside the new one.
drop function if exists public.review_supplier_document(uuid, uuid, text, timestamptz, text, text);

create or replace function public.review_supplier_document(
  p_document_id uuid,
  p_reviewer_id uuid,
  p_expected_status text,
  p_expected_reviewed_at timestamptz,
  p_decision text,
  p_reason text default null,
  p_expiry_date date default null
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
    review_notes = nullif(trim(coalesce(p_reason, '')), ''),
    expiry_date = coalesce(p_expiry_date, v_document.expiry_date)
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

revoke execute on function public.review_supplier_document(uuid, uuid, text, timestamptz, text, text, date) from public, anon, authenticated;
grant execute on function public.review_supplier_document(uuid, uuid, text, timestamptz, text, text, date) to service_role;
