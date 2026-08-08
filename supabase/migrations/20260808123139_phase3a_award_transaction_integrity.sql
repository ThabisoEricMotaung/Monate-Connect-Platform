begin;

do $$
begin
  if exists (select 1 from public.quotes where lower(coalesce(status, '')) = 'awarded' group by rfq_id having count(*) > 1) then
    raise exception 'Phase 3A preflight failed: an RFQ has multiple awarded quotes';
  end if;
  if exists (select 1 from public.purchase_orders where quote_id is not null group by quote_id having count(*) > 1) then
    raise exception 'Phase 3A preflight failed: duplicate purchase_orders.quote_id values';
  end if;
  if exists (select 1 from public.purchase_orders where rfq_id is not null group by rfq_id having count(*) > 1) then
    raise exception 'Phase 3A preflight failed: duplicate purchase_orders.rfq_id values';
  end if;
  if exists (select 1 from public.purchase_orders where po_number is not null group by po_number having count(*) > 1) then
    raise exception 'Phase 3A preflight failed: duplicate purchase_orders.po_number values';
  end if;
end;
$$;

create unique index quotes_one_awarded_per_rfq_idx on public.quotes (rfq_id)
  where lower(coalesce(status, '')) = 'awarded';
create unique index purchase_orders_quote_id_key on public.purchase_orders (quote_id) where quote_id is not null;
create unique index purchase_orders_rfq_id_key on public.purchase_orders (rfq_id) where rfq_id is not null;
create unique index purchase_orders_po_number_key on public.purchase_orders (po_number) where po_number is not null;

alter table public.quotes add constraint quotes_rfq_id_fkey
  foreign key (rfq_id) references public.rfqs(id) on delete cascade;
alter table public.purchase_orders add constraint purchase_orders_supplier_id_fkey
  foreign key (supplier_id) references public.profiles(id) on delete set null;

-- Legacy POs 1-3 retain their broken source IDs. These protect new writes
-- without validating or changing the existing rows.
alter table public.purchase_orders
  add constraint purchase_orders_rfq_id_fkey foreign key (rfq_id) references public.rfqs(id) on delete restrict not valid,
  add constraint purchase_orders_quote_id_fkey foreign key (quote_id) references public.quotes(id) on delete restrict not valid,
  add constraint purchase_orders_quote_rfq_fkey foreign key (quote_id, rfq_id)
    references public.quotes(id, rfq_id) on delete restrict not valid;

create sequence public.purchase_order_number_seq;
do $$
declare v_max bigint;
begin
  select coalesce(max(substring(po_number from '^PO-[0-9]{4}-([0-9]+)$')::bigint), 0)
    into v_max from public.purchase_orders where po_number ~ '^PO-[0-9]{4}-[0-9]+$';
  if v_max = 0 then
    perform pg_catalog.setval('public.purchase_order_number_seq', 1, false);
  else
    perform pg_catalog.setval('public.purchase_order_number_seq', v_max, true);
  end if;
end;
$$;

create function public.guard_quote_award_status_transition() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (lower(coalesce(old.status, '')) in ('awarded', 'not awarded')
      or lower(coalesce(new.status, '')) in ('awarded', 'not awarded'))
     and coalesce(current_setting('app.award_rfq_quote', true), '') <> 'on' then
    raise exception 'Award status transitions must use award_rfq_quote()' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger quotes_guard_award_status_transition before update of status on public.quotes
for each row execute function public.guard_quote_award_status_transition();

create function public.award_rfq_quote(p_rfq_id bigint, p_quote_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_role text; v_actor_email text;
  v_rfq public.rfqs%rowtype; v_quote public.quotes%rowtype;
  v_existing_winner_id bigint; v_loser_count integer := 0; v_loser_recipient_count integer := 0;
  v_rfq_title text; v_link text; v_previous_guard text;
begin
  if v_actor_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select lower(p.role), p.email into v_actor_role, v_actor_email from public.profiles p where p.id = v_actor_id;
  select r.* into v_rfq from public.rfqs r where r.id = p_rfq_id for update;
  if not found then raise exception 'RFQ % not found', p_rfq_id using errcode = 'P0002'; end if;
  if coalesce(v_actor_role, '') <> 'admin'
     and (coalesce(v_actor_role, '') <> 'buyer' or v_rfq.created_by is distinct from v_actor_id) then
    raise exception 'Only an administrator or the RFQ owner may award this RFQ' using errcode = '42501';
  end if;

  perform 1 from public.quotes q where q.rfq_id = p_rfq_id order by q.id for update;
  select q.* into v_quote from public.quotes q where q.id = p_quote_id and q.rfq_id = p_rfq_id;
  if not found then raise exception 'Quote % does not belong to RFQ %', p_quote_id, p_rfq_id using errcode = 'P0002'; end if;
  if v_quote.supplier_id is null then raise exception 'Quote % has no supplier and cannot be awarded', p_quote_id; end if;

  select q.id into v_existing_winner_id from public.quotes q
    where q.rfq_id = p_rfq_id and lower(coalesce(q.status, '')) = 'awarded';
  if v_existing_winner_id is not null then
    if v_existing_winner_id = p_quote_id and lower(coalesce(v_rfq.status, '')) = 'awarded' then
      return jsonb_build_object('rfq_id', p_rfq_id, 'quote_id', p_quote_id, 'status', 'already_awarded',
        'losing_quotes_updated', 0, 'losing_suppliers_notified', 0);
    end if;
    raise exception 'RFQ % is already awarded to quote %', p_rfq_id, v_existing_winner_id;
  end if;
  if lower(coalesce(v_rfq.status, '')) = 'awarded' then
    raise exception 'RFQ % is marked awarded but has no awarded quote', p_rfq_id;
  end if;

  v_previous_guard := current_setting('app.award_rfq_quote', true);
  perform set_config('app.award_rfq_quote', 'on', true);
  update public.quotes q set status = 'Not Awarded', updated_at = now()
    where q.rfq_id = p_rfq_id and q.id <> p_quote_id and lower(coalesce(q.status, '')) <> 'not awarded';
  get diagnostics v_loser_count = row_count;
  update public.quotes set status = 'Awarded', updated_at = now() where id = p_quote_id and rfq_id = p_rfq_id;
  update public.rfqs set status = 'awarded' where id = p_rfq_id;
  perform set_config('app.award_rfq_quote', coalesce(v_previous_guard, ''), true);

  v_rfq_title := coalesce(v_rfq.title, format('RFQ-%s', p_rfq_id));
  v_link := format('/dashboard/rfqs/%s', p_rfq_id);
  insert into public.audit_logs (user_id,user_email,action,entity_type,entity_id,old_values,new_values,metadata)
  values (v_actor_id,v_actor_email,'quote.awarded','quote',p_quote_id::text,
    jsonb_build_object('quote_status',v_quote.status,'rfq_status',v_rfq.status),
    jsonb_build_object('quote_status','Awarded','rfq_status','awarded'),
    jsonb_build_object('rfq_id',p_rfq_id,'supplier_id',v_quote.supplier_id,'supplier_name',v_quote.supplier_name,
      'losing_quotes_updated',v_loser_count));
  insert into public.activity_logs (actor_id,actor_email,action,entity_type,entity_id,metadata)
  values (v_actor_id,v_actor_email,'RFQ awarded','rfq',p_rfq_id::text,
    jsonb_build_object('quote_id',p_quote_id,'supplier_id',v_quote.supplier_id));

  insert into public.notifications (user_id,title,message,type,link,is_read)
  values (v_quote.supplier_id,'Quote awarded',format('Your quote for %s has been awarded.',v_rfq_title),
    'Quote Awarded',v_link,false);
  insert into public.whatsapp_alerts (user_id,supplier_id,phone,alert_type,title,message,link,status)
  select v_quote.supplier_id,v_quote.supplier_id,p.phone,'Quote Awarded','Quote awarded',
    format('Your quote for %s has been awarded.',v_rfq_title),v_link,'Draft'
  from public.profiles p where p.id=v_quote.supplier_id and nullif(trim(p.phone),'') is not null;

  with losing_suppliers as (
    select distinct q.supplier_id from public.quotes q
    where q.rfq_id=p_rfq_id and q.id<>p_quote_id and q.supplier_id is not null and q.supplier_id<>v_quote.supplier_id
  )
  insert into public.notifications (user_id,title,message,type,link,is_read)
  select ls.supplier_id,'RFQ award decision',
    format('Another supplier was selected for %s. Thank you for submitting a quote.',v_rfq_title),
    'Quote Not Awarded',v_link,false from losing_suppliers ls;
  get diagnostics v_loser_recipient_count = row_count;

  with losing_suppliers as (
    select distinct q.supplier_id from public.quotes q
    where q.rfq_id=p_rfq_id and q.id<>p_quote_id and q.supplier_id is not null and q.supplier_id<>v_quote.supplier_id
  )
  insert into public.whatsapp_alerts (user_id,supplier_id,phone,alert_type,title,message,link,status)
  select ls.supplier_id,ls.supplier_id,p.phone,'Quote Not Awarded','RFQ award decision',
    format('Another supplier was selected for %s. Thank you for submitting a quote.',v_rfq_title),v_link,'Draft'
  from losing_suppliers ls join public.profiles p on p.id=ls.supplier_id
  where nullif(trim(p.phone),'') is not null;

  return jsonb_build_object('rfq_id',p_rfq_id,'quote_id',p_quote_id,'status','awarded',
    'losing_quotes_updated',v_loser_count,'losing_suppliers_notified',v_loser_recipient_count);
end;
$$;

create function public.create_purchase_order_for_award(p_rfq_id bigint) returns public.purchase_orders
language plpgsql security definer set search_path = '' as $$
declare
  v_actor_id uuid := (select auth.uid());
  v_actor_role text; v_actor_email text;
  v_rfq public.rfqs%rowtype; v_quote public.quotes%rowtype;
  v_existing public.purchase_orders%rowtype; v_po public.purchase_orders%rowtype;
  v_supplier_name text; v_po_number text; v_link text;
begin
  if v_actor_id is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  select lower(p.role),p.email into v_actor_role,v_actor_email from public.profiles p where p.id=v_actor_id;
  select r.* into v_rfq from public.rfqs r where r.id=p_rfq_id for update;
  if not found then raise exception 'RFQ % not found',p_rfq_id using errcode='P0002'; end if;
  if coalesce(v_actor_role,'')<>'admin'
     and (coalesce(v_actor_role,'')<>'buyer' or v_rfq.created_by is distinct from v_actor_id) then
    raise exception 'Only an administrator or the RFQ owner may issue this purchase order' using errcode='42501';
  end if;
  select q.* into v_quote from public.quotes q
    where q.rfq_id=p_rfq_id and lower(coalesce(q.status,''))='awarded' for update;
  if not found then raise exception 'RFQ % has no awarded quote',p_rfq_id; end if;

  select po.* into v_existing from public.purchase_orders po
    where po.rfq_id=p_rfq_id or po.quote_id=v_quote.id order by po.id limit 1 for update;
  if found then
    if v_existing.rfq_id is distinct from p_rfq_id or v_existing.quote_id is distinct from v_quote.id then
      raise exception 'Existing purchase order source does not match RFQ % award',p_rfq_id;
    end if;
    return v_existing;
  end if;

  select coalesce(nullif(trim(v_quote.supplier_name),''),nullif(trim(p.business_name),''))
    into v_supplier_name from public.profiles p where p.id=v_quote.supplier_id;
  v_supplier_name := coalesce(v_supplier_name,v_quote.supplier_name,'Unknown supplier');
  v_po_number := format('PO-%s-%s',extract(year from current_date)::integer,
    lpad(nextval('public.purchase_order_number_seq')::text,4,'0'));

  insert into public.purchase_orders (rfq_id,quote_id,supplier_id,po_number,title,supplier_name,amount,timeline,status,generated_at,issue_date,is_demo)
  values (p_rfq_id,v_quote.id,v_quote.supplier_id,v_po_number,
    coalesce(v_rfq.title,format('RFQ-%s',p_rfq_id)),v_supplier_name,
    coalesce(v_quote.amount,v_quote.total_amount::text),coalesce(v_quote.timeline,v_quote.delivery_lead_time),
    'Issued',now(),current_date,coalesce(v_quote.is_demo,false)) returning * into v_po;
  v_link := format('/dashboard/purchase-orders/%s',v_po.id);

  insert into public.audit_logs (user_id,user_email,action,entity_type,entity_id,old_values,new_values,metadata)
  values (v_actor_id,v_actor_email,'purchase_order.generated','purchase_order',v_po.id::text,null,to_jsonb(v_po),
    jsonb_build_object('rfq_id',p_rfq_id,'quote_id',v_quote.id,'supplier_id',v_quote.supplier_id));
  insert into public.activity_logs (actor_id,actor_email,action,entity_type,entity_id,metadata)
  values (v_actor_id,v_actor_email,'purchase_order.created','purchase_order',v_po.id::text,
    jsonb_build_object('po_number',v_po.po_number,'rfq_id',p_rfq_id,'quote_id',v_quote.id,
      'supplier_name',v_supplier_name,'status','Issued'));

  if v_quote.supplier_id is not null then
    insert into public.notifications (user_id,title,message,type,link,is_read)
    values (v_quote.supplier_id,'Purchase order issued',
      format('%s has been issued for %s.',v_po.po_number,coalesce(v_rfq.title,format('RFQ-%s',p_rfq_id))),
      'Purchase Order Issued',v_link,false);
    insert into public.whatsapp_alerts (user_id,supplier_id,phone,alert_type,title,message,link,status)
    select v_quote.supplier_id,v_quote.supplier_id,p.phone,'Purchase Order Issued','Purchase order issued',
      format('%s has been issued for %s.',v_po.po_number,coalesce(v_rfq.title,format('RFQ-%s',p_rfq_id))),v_link,'Draft'
    from public.profiles p where p.id=v_quote.supplier_id and nullif(trim(p.phone),'') is not null;
  end if;
  return v_po;
end;
$$;

revoke all on function public.guard_quote_award_status_transition() from public,anon,authenticated;
revoke all on function public.award_rfq_quote(bigint,bigint) from public,anon;
revoke all on function public.create_purchase_order_for_award(bigint) from public,anon;
grant execute on function public.award_rfq_quote(bigint,bigint) to authenticated;
grant execute on function public.create_purchase_order_for_award(bigint) to authenticated;

drop policy if exists po_insert on public.purchase_orders;
revoke insert on public.purchase_orders from authenticated;

commit;
