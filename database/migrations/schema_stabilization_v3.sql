-- Monate Connect schema stabilization v3
-- Generated: 2026-06-07
-- Purpose: align additive database schema with fields queried by the current app.
-- Safety: additive only. No drops, truncates, destructive updates, or query workarounds.

create table if not exists public.profiles (
  id uuid primary key,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.profiles
  add column if not exists role text,
  add column if not exists business_name text,
  add column if not exists province text,
  add column if not exists industry text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists description text,
  add column if not exists employee_count text,
  add column if not exists founded_year integer,
  add column if not exists linkedin_url text,
  add column if not exists registration_number text,
  add column if not exists company_registration text,
  add column if not exists tax_reference text,
  add column if not exists vat_number text,
  add column if not exists verification_status text,
  add column if not exists verification_notes text,
  add column if not exists csd_number text,
  add column if not exists bbbee_level text,
  add column if not exists tax_status text,
  add column if not exists cidb_grade text,
  add column if not exists csd_document_url text,
  add column if not exists bbbee_document_url text,
  add column if not exists tax_document_url text,
  add column if not exists company_registration_url text,
  add column if not exists cidb_document_url text,
  add column if not exists capability_statement_url text,
  add column if not exists tax_expiry_date date,
  add column if not exists bbbee_expiry_date date,
  add column if not exists csd_expiry_date date,
  add column if not exists cidb_expiry_date date,
  add column if not exists banking_verification_status text,
  add column if not exists banking_verified boolean default false,
  add column if not exists bank_verified boolean default false,
  add column if not exists profile_complete boolean default false,
  add column if not exists smart_score numeric,
  add column if not exists smart_score_level text,
  add column if not exists readiness_score numeric,
  add column if not exists risk_level text,
  add column if not exists is_demo boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now());

create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  created_at timestamptz default timezone('utc', now())
);

alter table public.quotes
  add column if not exists rfq_id bigint,
  add column if not exists supplier_id uuid,
  add column if not exists supplier_name text,
  add column if not exists amount text,
  add column if not exists message text,
  add column if not exists timeline text,
  add column if not exists scope text,
  add column if not exists supporting_notes text,
  add column if not exists status text default 'Pending',
  add column if not exists submitted_at timestamptz default timezone('utc', now()),
  add column if not exists updated_at timestamptz default timezone('utc', now()),
  add column if not exists cover_note text,
  add column if not exists validity_days integer,
  add column if not exists delivery_lead_time text,
  add column if not exists payment_terms text,
  add column if not exists total_amount numeric,
  add column if not exists line_items jsonb,
  add column if not exists document_urls jsonb,
  add column if not exists is_demo boolean default false,
  add column if not exists created_at timestamptz default timezone('utc', now());

create table if not exists public.platform_settings (
  id bigint generated always as identity primary key,
  setting_key text unique,
  setting_value jsonb,
  category text,
  description text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

create index if not exists idx_profiles_business_name on public.profiles (business_name);
create index if not exists idx_profiles_verification_status on public.profiles (verification_status);
create index if not exists idx_profiles_updated_at on public.profiles (updated_at);
create index if not exists idx_profiles_smart_score on public.profiles (smart_score);
create index if not exists idx_quotes_supplier_id on public.quotes (supplier_id);
create index if not exists idx_quotes_rfq_id on public.quotes (rfq_id);
create index if not exists idx_quotes_submitted_at on public.quotes (submitted_at);
create index if not exists idx_platform_settings_key on public.platform_settings (setting_key);
create index if not exists idx_platform_settings_category on public.platform_settings (category);

insert into public.platform_settings (setting_key, setting_value, category, description)
values
  ('default_rfq_deadline_days', '{"value":14}'::jsonb, 'Procurement Rules', 'Default number of calendar days before a newly created RFQ closes.'),
  ('closing_soon_threshold_days', '{"value":3}'::jsonb, 'Procurement Rules', 'Number of days before deadline when an RFQ is treated as closing soon.'),
  ('allow_late_quotes', '{"value":false}'::jsonb, 'Procurement Rules', 'Whether suppliers can submit quotes after the configured deadline.'),
  ('require_rfq_attachments', '{"value":false}'::jsonb, 'Procurement Rules', 'Require an attachment before a procurement team can publish an RFQ.'),
  ('minimum_verification_status_for_awards', '{"value":"Verified"}'::jsonb, 'Supplier Verification', 'Supplier verification status required before an award can proceed.'),
  ('require_banking_verification_for_payment', '{"value":true}'::jsonb, 'Supplier Verification', 'Require verified banking details before supplier payment processing.'),
  ('require_tax_clearance', '{"value":true}'::jsonb, 'Supplier Verification', 'Require valid tax clearance documents for procurement readiness.'),
  ('require_bbbee', '{"value":true}'::jsonb, 'Supplier Verification', 'Require a BBBEE certificate or declaration for supplier verification.'),
  ('require_csd', '{"value":true}'::jsonb, 'Supplier Verification', 'Require Central Supplier Database registration evidence.'),
  ('verified_supplier_threshold', '{"value":750}'::jsonb, 'SmartScore Settings', 'SmartScore threshold used to classify suppliers as trusted or verified-ready.'),
  ('elite_supplier_threshold', '{"value":850}'::jsonb, 'SmartScore Settings', 'SmartScore threshold used to classify elite suppliers.'),
  ('high_risk_threshold', '{"value":399}'::jsonb, 'SmartScore Settings', 'SmartScore value at or below which a supplier is considered high risk.'),
  ('score_visibility', '{"value":true}'::jsonb, 'SmartScore Settings', 'Show SmartScore values to permitted dashboard users.'),
  ('enable_whatsapp_drafts', '{"value":true}'::jsonb, 'Notification Settings', 'Allow automation to create WhatsApp-ready alert drafts.'),
  ('enable_in_app_notifications', '{"value":true}'::jsonb, 'Notification Settings', 'Allow automation to create dashboard notification records.'),
  ('closing_soon_alerts', '{"value":true}'::jsonb, 'Notification Settings', 'Create alerts when RFQs approach their closing date.'),
  ('compliance_expiry_alerts', '{"value":true}'::jsonb, 'Notification Settings', 'Create alerts when supplier compliance documents approach expiry.'),
  ('invoice_approval_alerts', '{"value":true}'::jsonb, 'Notification Settings', 'Create alerts when invoices are approved for payment processing.'),
  ('require_invoice_approval_before_payment', '{"value":true}'::jsonb, 'Finance Controls', 'Prevent payment generation until the invoice approval gate is complete.'),
  ('require_verified_banking_before_payment', '{"value":true}'::jsonb, 'Finance Controls', 'Require supplier banking verification before payment processing.'),
  ('default_vat_rate', '{"value":15}'::jsonb, 'Finance Controls', 'Default VAT percentage used by finance workflows.'),
  ('default_language', '{"value":"English"}'::jsonb, 'Appearance & Accessibility Defaults', 'Default language shown for platform users.'),
  ('default_theme', '{"value":"System"}'::jsonb, 'Appearance & Accessibility Defaults', 'Default visual theme preference for new sessions.'),
  ('high_contrast_default', '{"value":false}'::jsonb, 'Appearance & Accessibility Defaults', 'Enable high-contrast presentation by default.'),
  ('low_data_mode_default', '{"value":false}'::jsonb, 'Appearance & Accessibility Defaults', 'Prefer lower-bandwidth interface defaults for new sessions.')
on conflict (setting_key) do update
set
  setting_value = excluded.setting_value,
  category = excluded.category,
  description = excluded.description,
  updated_at = timezone('utc', now());
