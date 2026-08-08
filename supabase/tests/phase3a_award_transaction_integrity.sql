begin;

select plan(22);

insert into auth.users (id, email)
values
  ('a3000000-0000-0000-0000-000000000001', 'phase3-owner@example.test'),
  ('a3000000-0000-0000-0000-000000000002', 'phase3-outsider@example.test'),
  ('a3000000-0000-0000-0000-000000000003', 'phase3-winner@example.test'),
  ('a3000000-0000-0000-0000-000000000004', 'phase3-loser@example.test');

insert into public.profiles (id, role, email, business_name, phone, registration_status)
values
  ('a3000000-0000-0000-0000-000000000001', 'buyer', 'phase3-owner@example.test', 'Test Buyer', null, 'complete'),
  ('a3000000-0000-0000-0000-000000000002', 'buyer', 'phase3-outsider@example.test', 'Other Buyer', null, 'complete'),
  ('a3000000-0000-0000-0000-000000000003', 'supplier', 'phase3-winner@example.test', 'Winner Supplier', '+27110000003', 'complete'),
  ('a3000000-0000-0000-0000-000000000004', 'supplier', 'phase3-loser@example.test', 'Losing Supplier', '+27110000004', 'complete');

insert into public.rfqs (id, title, status, created_by)
overriding system value
values
  (930001, 'Phase 3 atomic award test', 'Open', 'a3000000-0000-0000-0000-000000000001'),
  (930002, 'Phase 3 rollback test', 'Open', 'a3000000-0000-0000-0000-000000000001');

insert into public.quotes (id, rfq_id, supplier_id, supplier_name, amount, timeline, status)
overriding system value
values
  (930001, 930001, 'a3000000-0000-0000-0000-000000000003', 'Winner Supplier', 'R100.00', '7 days', 'Pending'),
  (930002, 930001, 'a3000000-0000-0000-0000-000000000004', 'Losing Supplier', 'R110.00', '8 days', 'Pending'),
  (930003, 930002, 'a3000000-0000-0000-0000-000000000003', 'Winner Supplier', 'R120.00', '9 days', 'Pending'),
  (930004, 930002, 'a3000000-0000-0000-0000-000000000004', 'Losing Supplier', 'R130.00', '10 days', 'Pending');

set local "request.jwt.claim.sub" = 'a3000000-0000-0000-0000-000000000002';
select throws_ok(
  $$ select public.award_rfq_quote(930001, 930001) $$,
  '42501',
  'Only an administrator or the RFQ owner may award this RFQ',
  'a non-owner buyer cannot award'
);
select is((select status from public.rfqs where id = 930001), 'Open', 'failed authorization leaves the RFQ unchanged');

set local "request.jwt.claim.sub" = 'a3000000-0000-0000-0000-000000000001';
select lives_ok($$ select public.award_rfq_quote(930001, 930001) $$, 'the RFQ owner can award atomically');
select is((select status from public.quotes where id = 930001), 'Awarded', 'the selected quote is awarded');
select is((select status from public.quotes where id = 930002), 'Not Awarded', 'the losing quote is rejected');
select is((select status from public.rfqs where id = 930001), 'awarded', 'the RFQ is marked awarded');
select is((select count(*)::integer from public.quotes where rfq_id = 930001 and status = 'Awarded'), 1, 'exactly one quote wins');
select is((select count(*)::integer from public.notifications where user_id = 'a3000000-0000-0000-0000-000000000003' and type = 'Quote Awarded'), 1, 'the winner is notified once');
select is((select count(*)::integer from public.notifications where user_id = 'a3000000-0000-0000-0000-000000000004' and type = 'Quote Not Awarded'), 1, 'the losing supplier is notified once');

select lives_ok($$ select public.award_rfq_quote(930001, 930001) $$, 'repeating the same award is idempotent');
select is((select count(*)::integer from public.notifications where user_id = 'a3000000-0000-0000-0000-000000000003' and type = 'Quote Awarded'), 1, 'award retry does not duplicate winner notification');
select is((select count(*)::integer from public.notifications where user_id = 'a3000000-0000-0000-0000-000000000004' and type = 'Quote Not Awarded'), 1, 'award retry does not duplicate loser notification');

set local app.award_rfq_quote = 'on';
select throws_ok(
  $$ update public.quotes set status = 'Awarded' where id = 930002 $$,
  '23505',
  null,
  'the unique index rejects a second winner even inside the RPC guard'
);
set local app.award_rfq_quote = '';
select throws_ok(
  $$ update public.quotes set status = 'Awarded' where id = 930004 $$,
  '42501',
  'Award status transitions must use award_rfq_quote()',
  'direct award transitions are rejected'
);

create function pg_temp.fail_phase3_notification() returns trigger language plpgsql as $$
begin
  if new.user_id = 'a3000000-0000-0000-0000-000000000003' and new.type = 'Quote Awarded' then
    raise exception 'forced notification failure';
  end if;
  return new;
end;
$$;
create trigger phase3_force_notification_failure before insert on public.notifications
for each row execute function pg_temp.fail_phase3_notification();
select throws_ok(
  $$ select public.award_rfq_quote(930002, 930003) $$,
  'P0001',
  'forced notification failure',
  'a downstream failure aborts the award RPC'
);
drop trigger phase3_force_notification_failure on public.notifications;
select is((select status from public.rfqs where id = 930002), 'Open', 'rollback restores the RFQ status');
select is((select status from public.quotes where id = 930003), 'Pending', 'rollback restores the selected quote');
select is((select status from public.quotes where id = 930004), 'Pending', 'rollback restores the losing quote');

set local "request.jwt.claim.sub" = 'a3000000-0000-0000-0000-000000000002';
select throws_ok(
  $$ select public.create_purchase_order_for_award(930001) $$,
  '42501',
  'Only an administrator or the RFQ owner may issue this purchase order',
  'a non-owner buyer cannot issue a purchase order'
);
set local "request.jwt.claim.sub" = 'a3000000-0000-0000-0000-000000000001';
select lives_ok($$ select public.create_purchase_order_for_award(930001) $$, 'an owner can issue the awarded PO');
select lives_ok($$ select public.create_purchase_order_for_award(930001) $$, 'PO issuance retry is idempotent');
select is((select count(*)::integer from public.purchase_orders where rfq_id = 930001), 1, 'PO retry produces one purchase order');

select * from finish();
rollback;
