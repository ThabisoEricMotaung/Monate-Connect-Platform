begin;

create schema if not exists private;

create or replace function private.complete_role_registration(p_user_id uuid, p_email text, p_payload jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_profile public.profiles%rowtype;
  v_role text; v_first text; v_last text; v_name text; v_business text; v_phone text;
  v_industry text; v_province text; v_provinces text[]; v_now timestamptz := timezone('utc', now());
begin
  if p_user_id is null or nullif(btrim(p_email), '') is null then raise exception 'Authenticated user identity is required.' using errcode = '42501'; end if;
  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Registration profile was not found.' using errcode = 'P0002'; end if;
  if v_profile.registration_status = 'complete' then return lower(v_profile.role); end if;
  v_role := coalesce(v_profile.intended_role, nullif(lower(btrim(p_payload->>'role')), ''));
  if v_role not in ('supplier','buyer') then raise exception 'Choose a supplier or buyer account.' using errcode = '22023'; end if;
  if v_profile.intended_role is not null and lower(btrim(p_payload->>'role')) is distinct from v_profile.intended_role then
    raise exception 'The submitted role does not match the secured OAuth role.' using errcode = '42501';
  end if;
  if coalesce((p_payload->>'termsAccepted')::boolean, false) is not true then raise exception 'You must accept the Terms of Service and Privacy Policy.'; end if;
  v_first := btrim(coalesce(p_payload->>'firstName','')); v_last := btrim(coalesce(p_payload->>'lastName',''));
  v_name := btrim(concat_ws(' ', v_first, v_last)); v_phone := btrim(coalesce(p_payload->>'phone',''));
  v_business := btrim(coalesce(p_payload->>'businessName','')); v_industry := btrim(coalesce(p_payload->>'industry',''));
  select coalesce(array_agg(btrim(value)) filter (where btrim(value) <> ''), '{}'::text[]) into v_provinces
  from jsonb_array_elements_text(coalesce(p_payload->'provinces', '[]'::jsonb));
  v_province := array_to_string(v_provinces, ', ');
  if v_first = '' or v_last = '' then raise exception 'First name and surname are required.'; end if;
  if v_phone !~ '^((\+27|0)[6-8][0-9]{8})$' then raise exception 'Enter a valid South African phone number.'; end if;

  if v_role = 'supplier' then
    if v_business = '' or btrim(coalesce(p_payload->>'registrationNumber','')) = '' or v_industry = '' or cardinality(v_provinces) = 0
      or btrim(coalesce(p_payload->>'csdNumber','')) !~* '^MAAA-[0-9]{8}$' or btrim(coalesce(p_payload->>'bbeeLevel','')) = '' then
      raise exception 'Complete all required supplier registration fields.';
    end if;
    update public.profiles set email = lower(p_email), first_name=v_first, last_name=v_last, full_name=v_name,
      preferred_name=v_first, business_name=v_business, company_registration=btrim(p_payload->>'registrationNumber'), phone=v_phone,
      industry=v_industry, provinces=v_provinces, province=v_province, csd_number=upper(btrim(p_payload->>'csdNumber')),
      bbbee_level=btrim(p_payload->>'bbeeLevel'), tax_reference=nullif(btrim(p_payload->>'taxReference'),''),
      vat_number=nullif(btrim(p_payload->>'vatNumber'),''), role='supplier', intended_role='supplier',
      terms_accepted_at=v_now, registration_status='complete', registration_completed_at=v_now, updated_at=v_now where id=p_user_id;
  else
    if v_name = '' or v_business = '' or v_industry = '' or cardinality(v_provinces) = 0 then
      raise exception 'Complete all required buyer registration fields.';
    end if;
    update public.profiles set email=lower(p_email), first_name=v_first, last_name=v_last, full_name=v_name, preferred_name=v_first,
      business_name=v_business, phone=v_phone, industry=v_industry, provinces=v_provinces, province=v_province,
      role='buyer', intended_role='buyer', terms_accepted_at=v_now, registration_status='complete', registration_completed_at=v_now, updated_at=v_now where id=p_user_id;
    update public.buyer_profiles set organisation_name=v_business, organisation_type=v_industry, procurement_contact=v_name,
      procurement_email=lower(p_email), procurement_phone=v_phone, industry=v_industry, province=v_province, updated_at=v_now
    where user_id=p_user_id;
    if not found then
      insert into public.buyer_profiles (user_id, organisation_name, organisation_type, procurement_contact, procurement_email, procurement_phone, industry, province, updated_at)
      values (p_user_id, v_business, v_industry, v_name, lower(p_email), v_phone, v_industry, v_province, v_now);
    end if;
  end if;
  return v_role;
end $$;
revoke all on function private.complete_role_registration(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.complete_role_registration(p_payload jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  raise exception 'Legacy completion signature is disabled.' using errcode='42501';
end $$;
revoke all on function public.complete_role_registration(jsonb) from public, anon, authenticated;

create or replace function public.complete_role_registration(p_user_id uuid, p_email text, p_payload jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  return private.complete_role_registration(p_user_id, p_email, p_payload);
end $$;
revoke all on function public.complete_role_registration(uuid, text, jsonb) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.complete_role_registration(uuid, text, jsonb) to service_role;
grant execute on function public.complete_role_registration(uuid, text, jsonb) to service_role;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id,email,first_name,last_name,full_name,preferred_name,role,intended_role,registration_status)
  values (new.id,new.email,new.raw_user_meta_data->>'first_name',new.raw_user_meta_data->>'last_name',
    coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name'),
    coalesce(new.raw_user_meta_data->>'preferred_name',new.raw_user_meta_data->>'first_name'),null,null,'draft')
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;;
