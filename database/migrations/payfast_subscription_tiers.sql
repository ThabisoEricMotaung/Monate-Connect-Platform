-- Additive correction for environments where payfast_subscriptions.sql was
-- already applied with the original generic buyer tier.

alter table if exists public.subscriptions
  drop constraint if exists subscriptions_tier_check;

alter table if exists public.subscriptions
  add constraint subscriptions_tier_check
  check (tier in ('supplier', 'buyer_starter', 'buyer_professional'));
