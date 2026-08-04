begin;

do $$
declare
  v_actor_id uuid;
  v_actor_email constant text := 'smartscore-phase2-backfill@aiformprocure.co.za';
  v_reason constant text := 'SYSTEM MIGRATION BACKFILL: profiles.director_verified=true; batch=2026-08-04';
  v_execution_time timestamptz := clock_timestamp();
  v_candidate_count integer;
  v_attestation_id uuid;
  v_refresh jsonb;
  v_candidate record;
begin
  select u.id
  into v_actor_id
  from auth.users u
  where lower(u.email) = lower(v_actor_email)
  limit 1;

  if v_actor_id is null then
    v_actor_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      banned_until,
      is_sso_user,
      is_anonymous
    )
    values (
      coalesce(
        (select u.instance_id from auth.users u where u.instance_id is not null limit 1),
        '00000000-0000-0000-0000-000000000000'::uuid
      ),
      v_actor_id,
      'authenticated',
      'authenticated',
      v_actor_email,
      null,
      v_execution_time,
      jsonb_build_object(
        'provider', 'system',
        'providers', jsonb_build_array('system'),
        'system_actor', true,
        'purpose', 'legacy-director-backfill-2026-08-04'
      ),
      jsonb_build_object('display_name', 'SmartScore Phase 2 migration backfill'),
      v_execution_time,
      v_execution_time,
      v_execution_time + interval '100 years',
      false,
      false
    );
  end if;

  if not exists (
    select 1
    from auth.users u
    where u.id = v_actor_id
      and lower(u.email) = lower(v_actor_email)
      and u.banned_until > v_execution_time
      and coalesce((u.raw_app_meta_data ->> 'system_actor')::boolean, false)
      and u.raw_app_meta_data ->> 'purpose' = 'legacy-director-backfill-2026-08-04'
  ) then
    raise exception 'Director backfill system principal is missing or not disabled/marked';
  end if;

  -- The auth trigger creates a draft public profile. The system identity is only
  -- a non-login FK/audit principal and must never become an application profile.
  delete from public.profiles where id = v_actor_id;

  create temporary table director_backfill_candidates on commit drop as
  select
    p.id as profile_id,
    p.company_registration as evidence_reference,
    p.smart_score as before_smart_score,
    p.verification_status as before_verification_status,
    public.supplier_compliance_base(p.id) as previous_compliance
  from public.profiles p
  where p.director_verified is true
    and nullif(btrim(coalesce(p.company_registration, '')), '') is not null
    and not exists (
      select 1
      from public.verification_attestations a
      where a.profile_id = p.id
        and a.category = 'director'
    )
  order by p.id;

  select count(*) into v_candidate_count from director_backfill_candidates;
  if v_candidate_count <> 5 then
    raise exception 'Director backfill guard failed: expected 5 candidates, found %', v_candidate_count;
  end if;

  for v_candidate in select * from director_backfill_candidates order by profile_id
  loop
    insert into public.verification_attestations (
      profile_id,
      category,
      decision,
      reason,
      evidence_reference,
      reviewed_by,
      reviewed_at,
      expires_at
    )
    values (
      v_candidate.profile_id,
      'director',
      'approved',
      v_reason,
      btrim(v_candidate.evidence_reference),
      v_actor_id,
      v_execution_time,
      null
    )
    returning id into v_attestation_id;

    v_refresh := public.refresh_supplier_verification(
      v_candidate.profile_id,
      v_candidate.previous_compliance
    );

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
      v_actor_id,
      v_actor_email,
      'verification_attestation.legacy_backfilled',
      'verification_attestation',
      v_attestation_id::text,
      jsonb_build_object(
        'director_verified', true,
        'smart_score', v_candidate.before_smart_score,
        'verification_status', v_candidate.before_verification_status
      ),
      jsonb_build_object(
        'category', 'director',
        'decision', 'approved',
        'reason', v_reason,
        'reviewed_by', v_actor_id,
        'reviewed_at', v_execution_time,
        'expires_at', null
      ),
      jsonb_build_object(
        'migration', 'legacy_director_attestation_backfill',
        'batch', '2026-08-04',
        'profile_id', v_candidate.profile_id,
        'refresh', v_refresh
      ),
      v_execution_time
    );
  end loop;
end
$$;

commit;
