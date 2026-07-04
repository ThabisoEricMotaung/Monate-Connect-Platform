-- PayFast subscription billing.
-- Apply this in Supabase before enabling the live checkout buttons.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null,
  status text not null default 'pending' check (status in ('active', 'cancelled', 'past_due', 'pending')),
  payfast_token text,
  payfast_payment_id text,
  merchant_payment_id text,
  amount numeric(12, 2) not null,
  billing_frequency text not null check (billing_frequency in ('monthly', 'annual')),
  next_billing_date date,
  raw_itn_payload jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint subscriptions_one_per_user unique (user_id),
  constraint subscriptions_tier_check check (tier in ('supplier', 'buyer_starter', 'buyer_professional'))
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_payfast_token_idx on public.subscriptions (payfast_token);
create index if not exists subscriptions_merchant_payment_id_idx on public.subscriptions (merchant_payment_id);

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_subscriptions_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;

create policy "Users can read their own subscription"
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id);

-- No insert/update/delete policies are intentionally created. Supabase service-role
-- clients bypass RLS and are the only writers used by the PayFast server routes.

create table if not exists public.payfast_itn_logs (
  id uuid primary key default gen_random_uuid(),
  merchant_payment_id text,
  payfast_payment_id text,
  request_ip text,
  validation_status text not null check (validation_status in ('received', 'accepted', 'rejected', 'error')),
  validation_errors text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists payfast_itn_logs_created_at_idx on public.payfast_itn_logs (created_at desc);
create index if not exists payfast_itn_logs_merchant_payment_id_idx on public.payfast_itn_logs (merchant_payment_id);

alter table public.payfast_itn_logs enable row level security;

-- ITN logs contain raw payment webhook data. Keep them service-role only.
