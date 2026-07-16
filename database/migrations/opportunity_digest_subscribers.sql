-- Public, no-account-required signups for the weekly "open opportunities"
-- email — the lower-commitment path for someone who found /opportunities
-- (or a shared /opportunities/[id] link) but isn't ready to create a full
-- supplier account yet. See src/app/api/opportunity-digest/subscribe and
-- src/app/api/cron/opportunity-digest.

create table if not exists public.opportunity_digest_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'opportunities_page',
  created_at timestamptz not null default timezone('utc', now()),
  unsubscribed_at timestamptz,
  last_sent_at timestamptz
);

-- One row per email ever — (re)subscribing clears unsubscribed_at on the
-- existing row rather than creating a duplicate.
create unique index if not exists idx_opportunity_digest_subscribers_email
  on public.opportunity_digest_subscribers (lower(email));

create index if not exists idx_opportunity_digest_subscribers_active
  on public.opportunity_digest_subscribers (unsubscribed_at);

alter table public.opportunity_digest_subscribers enable row level security;

-- No insert/update/select policy for anon/authenticated: the only writers
-- are the subscribe and unsubscribe API routes, both of which use
-- supabaseAdmin (service role), which bypasses RLS entirely. Mirrors the
-- admin/buyer-only read policy already used on public.email_alerts, in case
-- a small admin view of subscriber counts gets built later.
drop policy if exists "opportunity_digest_subscribers_admin_buyer_select" on public.opportunity_digest_subscribers;

create policy "opportunity_digest_subscribers_admin_buyer_select"
  on public.opportunity_digest_subscribers
  for select
  using (
    exists (
      select 1
      from public.profiles admin_profile
      where admin_profile.id = auth.uid()
        and lower(coalesce(admin_profile.role, '')) in ('admin', 'buyer')
    )
  );
