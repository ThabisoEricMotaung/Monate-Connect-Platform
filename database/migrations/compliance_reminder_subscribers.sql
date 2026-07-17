-- Public, no-account-required B-BBEE expiry reminder signup — a lead
-- magnet: compliance anxiety is a real, recurring reason for a non-user to
-- hand over an email address. Mirrors opportunity_digest_subscribers.
-- See src/app/api/compliance-reminder/subscribe and
-- src/app/api/cron/compliance-reminders.
--
-- reminder_type is kept as a column (rather than hardcoding B-BBEE) so a
-- second reminder type (e.g. CSD/tax clearance) can reuse this table later
-- without a schema change.

create table if not exists public.compliance_reminder_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  reminder_type text not null default 'bbbee_expiry',
  expiry_date date not null,
  reminded_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- One row per email per reminder type — resubmitting (e.g. after renewing
-- their certificate) updates the existing row rather than duplicating.
create unique index if not exists idx_compliance_reminder_subscribers_email_type
  on public.compliance_reminder_subscribers (lower(email), reminder_type);

create index if not exists idx_compliance_reminder_subscribers_expiry
  on public.compliance_reminder_subscribers (expiry_date);

alter table public.compliance_reminder_subscribers enable row level security;

-- No insert/update/select policy for anon/authenticated: the only writers
-- are the subscribe and unsubscribe API routes, both of which use
-- supabaseAdmin (service role), which bypasses RLS entirely. Mirrors the
-- admin/buyer-only read policy already used on public.email_alerts and
-- public.opportunity_digest_subscribers.
drop policy if exists "compliance_reminder_subscribers_admin_buyer_select" on public.compliance_reminder_subscribers;

create policy "compliance_reminder_subscribers_admin_buyer_select"
  on public.compliance_reminder_subscribers
  for select
  using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and lower(coalesce(admin_profile.role, '')) in ('admin', 'buyer')
    )
  );
