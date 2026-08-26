-- Align the live, canonical WhatsApp alert schema (phone/link/status) with
-- the automation metadata used by the dashboard and draft generators.
alter table public.whatsapp_alerts
  add column if not exists user_email text,
  add column if not exists supplier_name text,
  add column if not exists supplier_phone text,
  add column if not exists rfq_id bigint,
  add column if not exists metadata jsonb,
  add column if not exists is_demo boolean not null default false;

update public.whatsapp_alerts
set supplier_phone = phone
where supplier_phone is null and phone is not null;

create or replace function public.sync_whatsapp_alert_phone_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.phone is null then
    new.phone := new.supplier_phone;
  end if;
  if new.supplier_phone is null or new.supplier_phone is distinct from new.phone then
    new.supplier_phone := new.phone;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_whatsapp_alert_phone_columns on public.whatsapp_alerts;
create trigger sync_whatsapp_alert_phone_columns
before insert or update of phone, supplier_phone on public.whatsapp_alerts
for each row execute function public.sync_whatsapp_alert_phone_columns();

create index if not exists idx_whatsapp_alerts_rfq_id
  on public.whatsapp_alerts (rfq_id);

create index if not exists idx_whatsapp_alerts_automation_generated
  on public.whatsapp_alerts ((metadata ->> 'automation_generated'))
  where metadata ? 'automation_generated';
