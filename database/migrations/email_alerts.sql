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

-- Only admin/buyer users may read alert logs (contains supplier email addresses and
-- message content). Mirrors the admin/buyer read policy on public.supplier_documents.
-- No insert/update/delete policy exists for anon/authenticated: the only writer is
-- src/app/api/match-alerts/email/route.ts, which uses supabaseAdmin (service role),
-- and the service_role Postgres role bypasses RLS entirely regardless of policies.
drop policy if exists "email_alerts_select" on public.email_alerts;
drop policy if exists "email_alerts_insert" on public.email_alerts;

create policy "email_alerts_admin_buyer_select"
  on public.email_alerts
  for select
  using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and lower(coalesce(admin_profile.role, '')) in ('admin', 'buyer')
    )
  );
