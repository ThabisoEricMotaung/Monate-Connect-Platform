create table if not exists public.email_alerts (
  id bigint generated always as identity primary key,
  user_id uuid,
  user_email text,
  supplier_id uuid,
  supplier_name text,
  supplier_email text,
  alert_type text,
  subject text,
  message text,
  rfq_id bigint,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  sent_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default timezone('utc', now())
);

create index if not exists idx_email_alerts_supplier_id on public.email_alerts (supplier_id);
create index if not exists idx_email_alerts_rfq_id on public.email_alerts (rfq_id);
create index if not exists idx_email_alerts_status on public.email_alerts (status);
create index if not exists idx_email_alerts_sent_at on public.email_alerts (sent_at);

alter table public.email_alerts enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'email_alerts'
      and policyname = 'email_alerts_select'
  ) then
    execute 'create policy "email_alerts_select" on public.email_alerts for select using (true)';
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'email_alerts'
      and policyname = 'email_alerts_insert'
  ) then
    execute 'create policy "email_alerts_insert" on public.email_alerts for insert with check (true)';
  end if;
end $$;
