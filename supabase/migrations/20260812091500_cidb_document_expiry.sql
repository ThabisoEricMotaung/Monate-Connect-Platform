-- Extend the compliance-document expiry check to CIDB, matching the
-- csd/bbbee/tax_clearance treatment added in
-- 20260806090000_supplier_document_expiry_phase1.sql. CIDB does not carry a
-- score term in supplier_compliance_base today, so this has no effect on the
-- returned integer yet -- it keeps the expiry check consistent for the day a
-- CIDB score term is added, and for any other function that reads
-- supplier_documents.status/expiry_date directly.

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
           d.document_type not in ('csd', 'bbbee', 'tax_clearance', 'cidb')
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
