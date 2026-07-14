-- Adds the is_demo column to the tables the admin dashboard filters on.
--
-- Root cause: src/app/dashboard/admin/page.tsx and
-- src/app/dashboard/admin/layout.tsx query rfqs, quotes, contracts,
-- purchase_orders, and invoices with .eq("is_demo", false) to exclude
-- seeded demo data from real dashboard stats. That filter assumed the
-- is_demo column from the "Demo Mode" feature (see src/lib/demoSeed.ts)
-- had already been added via its own setup SQL, but that setup was never
-- run against this database. Filtering on a column that doesn't exist
-- fails the entire query (confirmed via information_schema.columns), so
-- every one of these dashboard queries was silently returning zero rows.
--
-- This adds just the column, defaulting to false, with no seeded demo
-- data — so every existing real row is correctly included once this runs.

alter table public.rfqs add column if not exists is_demo boolean default false;
alter table public.quotes add column if not exists is_demo boolean default false;
alter table public.contracts add column if not exists is_demo boolean default false;
alter table public.purchase_orders add column if not exists is_demo boolean default false;
alter table public.invoices add column if not exists is_demo boolean default false;
