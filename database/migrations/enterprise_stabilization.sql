-- ═══════════════════════════════════════════════════════════════════════════════
-- Monate Connect — Enterprise Stabilization Migration
-- Generated : 2026-06-05
-- Scope     : Create all missing tables, add all missing columns, enable RLS,
--             add development-safe policies, and create indexes.
-- Safety    : Every statement is idempotent (CREATE ... IF NOT EXISTS,
--             ALTER TABLE ... ADD COLUMN IF NOT EXISTS, DO $$ IF NOT EXISTS ...).
--             Safe to run repeatedly without data loss.
-- WARNING   : RLS policies use (true) predicates for development convenience.
--             Tighten to user-scoped predicates before production deployment.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ UTILITY : auto-update updated_at on any table that has the column           │
-- └─────────────────────────────────────────────────────────────────────────────┘

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION A — CORE TABLES                                                     │
-- │ These tables very likely already exist in your Supabase project.            │
-- │ All CREATE TABLE statements are guarded with IF NOT EXISTS.                 │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ─── A.1  profiles ───────────────────────────────────────────────────────────
-- Referenced by: src/lib/auth.ts, src/lib/intelligence.ts,
--   src/lib/supplierRisk.ts, src/lib/purchaseOrders.ts, etc.

create table if not exists public.profiles (
  id                          uuid primary key references auth.users on delete cascade,
  role                        text,
  business_name               text,
  province                    text,
  industry                    text,
  phone                       text,
  email                       text,
  verification_status         text,
  verification_notes          text,
  csd_number                  text,
  bbbee_level                 text,
  tax_status                  text,
  company_registration        text,
  cidb_grade                  text,
  csd_document_url            text,
  bbbee_document_url          text,
  tax_document_url            text,
  company_registration_url    text,
  cidb_document_url           text,
  capability_statement_url    text,
  tax_expiry_date             date,
  bbbee_expiry_date           date,
  csd_expiry_date             date,
  cidb_expiry_date            date,
  banking_verification_status text,
  updated_at                  timestamptz default timezone('utc', now()),
  banking_verified            boolean     default false,
  profile_complete            boolean     default false,
  is_demo                     boolean     default false,
  created_at                  timestamptz default timezone('utc', now())
);


-- ─── A.2  rfqs ────────────────────────────────────────────────────────────────
-- Referenced by: src/lib/rfqs.ts, src/lib/automationRules.ts, etc.

create table if not exists public.rfqs (
  id          bigint generated always as identity primary key,
  title       text,
  description text,
  category    text,
  province    text,
  region      text,
  budget      text,
  deadline    timestamptz,
  status      text        default 'Open',
  created_by  uuid,
  is_demo     boolean     default false,
  created_at  timestamptz default timezone('utc', now())
);


-- ─── A.3  quotes ─────────────────────────────────────────────────────────────
-- Referenced by: src/lib/quotes.ts, src/lib/purchaseOrders.ts, etc.

create table if not exists public.quotes (
  id               bigint generated always as identity primary key,
  rfq_id           bigint,
  supplier_id      uuid,
  supplier_name    text,
  amount           text,
  message          text,
  timeline         text,
  scope            text,
  supporting_notes text,
  status           text        default 'Pending',
  is_demo          boolean     default false,
  created_at       timestamptz default timezone('utc', now())
);


-- ─── A.4  purchase_orders ────────────────────────────────────────────────────
-- Referenced by: src/lib/purchaseOrders.ts
-- generated_at is the canonical issue timestamp.
-- issue_date is a demo-data alias used in src/lib/demoStories.ts.

create table if not exists public.purchase_orders (
  id             bigint generated always as identity primary key,
  po_number      text,
  rfq_id         bigint,
  quote_id       bigint,
  supplier_id    uuid,
  supplier_name  text,
  amount         text,
  timeline       text,
  title          text,
  status         text        default 'Issued',
  generated_at   timestamptz default timezone('utc', now()),
  issue_date     timestamptz,
  delivery_date  timestamptz,
  notes          text,
  is_demo        boolean     default false,
  created_at     timestamptz default timezone('utc', now())
);


-- ─── A.5  contracts ──────────────────────────────────────────────────────────
-- Referenced by: src/lib/contracts.ts

create table if not exists public.contracts (
  id                bigint generated always as identity primary key,
  contract_number   text,
  supplier_id       uuid,
  supplier_name     text,
  rfq_id            bigint,
  purchase_order_id bigint,
  contract_value    text,
  start_date        date,
  end_date          date,
  renewal_date      date,
  status            text        default 'Draft',
  notes             text,
  document_url      text,
  is_demo           boolean     default false,
  created_at        timestamptz default timezone('utc', now())
);


-- ─── A.6  invoices ───────────────────────────────────────────────────────────
-- Referenced by: src/lib/invoices.ts
-- vat / total are legacy aliases for vat_amount / total_amount.

create table if not exists public.invoices (
  id                bigint generated always as identity primary key,
  invoice_number    text,
  supplier_id       uuid,
  supplier_name     text,
  contract_id       bigint,
  purchase_order_id bigint,
  rfq_id            bigint,
  amount            text,
  vat_amount        text,
  total_amount      text,
  vat               text,
  total             text,
  due_date          date,
  status            text        default 'Draft',
  notes             text,
  is_demo           boolean     default false,
  created_at        timestamptz default timezone('utc', now())
);


-- ─── A.7  payments ───────────────────────────────────────────────────────────
-- Referenced by: src/lib/payments.ts

create table if not exists public.payments (
  id               bigint generated always as identity primary key,
  payment_number   text,
  invoice_id       bigint,
  supplier_id      uuid,
  supplier_name    text,
  amount           text,
  payment_method   text,
  reference_number text,
  payment_date     date,
  status           text        default 'Pending',
  notes            text,
  is_demo          boolean     default false,
  created_at       timestamptz default timezone('utc', now())
);


-- ─── A.8  messages ───────────────────────────────────────────────────────────
-- Referenced by: src/lib/messages.ts

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  sender_id   uuid,
  receiver_id uuid,
  subject     text,
  message     text,
  rfq_id      bigint,
  quote_id    bigint,
  is_read     boolean     default false,
  created_at  timestamptz default timezone('utc', now())
);


-- ─── A.9  notifications ──────────────────────────────────────────────────────
-- Referenced by: src/lib/notifications.ts
-- Column is "read" (boolean), not "is_read".

create table if not exists public.notifications (
  id           bigint generated always as identity primary key,
  recipient_id uuid,
  type         text,
  title        text,
  message      text,
  link         text,
  read         boolean     default false,
  metadata     jsonb,
  created_at   timestamptz default timezone('utc', now())
);


-- ─── A.10  audit_logs ────────────────────────────────────────────────────────
-- Referenced by: src/lib/audit.ts

create table if not exists public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid,
  user_email  text,
  action      text,
  entity_type text,
  entity_id   text,
  old_values  jsonb,
  new_values  jsonb,
  metadata    jsonb,
  created_at  timestamptz default timezone('utc', now())
);


-- ─── A.11  activity_logs ─────────────────────────────────────────────────────
-- Referenced by: src/lib/activity.ts, src/lib/purchaseOrders.ts

create table if not exists public.activity_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid,
  actor_email text,
  action      text,
  entity_type text,
  entity_id   text,
  metadata    jsonb,
  created_at  timestamptz default timezone('utc', now())
);


-- ─── A.12  supplier_reviews ──────────────────────────────────────────────────
-- Referenced by: src/lib/supplierRisk.ts, src/app/dashboard/suppliers/[id]/page.tsx

create table if not exists public.supplier_reviews (
  id                  bigint generated always as identity primary key,
  supplier_id         uuid,
  reviewer_id         uuid,
  reviewer_email      text,
  rating              numeric,
  delivery_score      numeric,
  price_score         numeric,
  compliance_score    numeric,
  communication_score numeric,
  quality_score       numeric,
  notes               text,
  created_at          timestamptz default timezone('utc', now())
);


-- ─── A.13  saved_suppliers ───────────────────────────────────────────────────
-- Referenced by: src/lib/savedSuppliers.ts
-- upsert onConflict: "user_id,supplier_id" — unique constraint required.

create table if not exists public.saved_suppliers (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null,
  supplier_id uuid        not null,
  notes       text,
  created_at  timestamptz default timezone('utc', now()),
  unique (user_id, supplier_id)
);


-- ─── A.14  buyer_profiles ────────────────────────────────────────────────────
-- Referenced in: src/app/dashboard/admin/system-health/page.tsx (health check).
-- Stores buyer-organisation configuration separate from profiles.

create table if not exists public.buyer_profiles (
  id                 bigint generated always as identity primary key,
  user_id            uuid unique,
  organisation_name  text,
  organisation_type  text,
  province           text,
  contact_email      text,
  contact_phone      text,
  procurement_budget text,
  notes              text,
  created_at         timestamptz default timezone('utc', now()),
  updated_at         timestamptz default timezone('utc', now())
);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION B — ENTERPRISE TABLES                                               │
-- │ Tables confirmed missing from most Supabase projects.                       │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ─── B.1  saved_rfqs ─────────────────────────────────────────────────────────
-- Referenced by: src/lib/savedRFQs.ts, src/app/dashboard/saved-rfqs/page.tsx
-- upsert onConflict: "user_id,rfq_id" — unique constraint required.

create table if not exists public.saved_rfqs (
  id         bigint generated always as identity primary key,
  user_id    uuid        not null,
  rfq_id     bigint      not null,
  notes      text,
  created_at timestamptz default timezone('utc', now()),
  unique (user_id, rfq_id)
);


-- ─── B.2  supplier_bank_details ──────────────────────────────────────────────
-- Referenced by: src/app/dashboard/banking/page.tsx, src/lib/payments.ts,
--   src/lib/intelligence.ts, src/lib/supplierRisk.ts

create table if not exists public.supplier_bank_details (
  id                  bigint generated always as identity primary key,
  supplier_id         uuid,
  bank_name           text,
  account_holder      text,
  account_number      text,
  branch_code         text,
  account_type        text,
  verification_status text        default 'Unverified',
  verification_notes  text,
  created_at          timestamptz default timezone('utc', now()),
  updated_at          timestamptz default timezone('utc', now())
);


-- ─── B.3  pilot_requests ─────────────────────────────────────────────────────
-- Referenced by: src/app/dashboard/admin/pilot-requests/page.tsx

create table if not exists public.pilot_requests (
  id             bigint generated always as identity primary key,
  name           text,
  organisation   text,
  email          text,
  phone          text,
  request_type   text,
  province       text,
  message        text,
  status         text        default 'New',
  assigned_to    text,
  follow_up_date date,
  internal_notes text,
  created_at     timestamptz default timezone('utc', now()),
  updated_at     timestamptz default timezone('utc', now())
);


-- ─── B.4  procurement_overrides ──────────────────────────────────────────────
-- Referenced by: src/lib/procurementOverrides.ts

create table if not exists public.procurement_overrides (
  id                  bigint generated always as identity primary key,
  entity_type         text,
  entity_id           text,
  blocked_reason      text,
  override_reason     text,
  requested_by        uuid,
  requested_by_email  text,
  approved_by         uuid,
  approved_by_email   text,
  status              text        default 'Requested',
  created_at          timestamptz default timezone('utc', now()),
  approved_at         timestamptz
);


-- ─── B.5  rfq_templates ──────────────────────────────────────────────────────
-- Referenced by: src/app/dashboard/admin/rfq-templates/page.tsx,
--   src/lib/rfqTemplateKeys.ts (shared key constant)

create table if not exists public.rfq_templates (
  id                      bigint generated always as identity primary key,
  created_by              uuid,
  template_name           text,
  category                text,
  province                text,
  title                   text,
  description             text,
  compliance_requirements text,
  evaluation_criteria     text,
  default_deadline_days   int         default 14,
  created_at              timestamptz default timezone('utc', now()),
  updated_at              timestamptz default timezone('utc', now())
);


-- ─── B.6  workflow_rules ─────────────────────────────────────────────────────
-- Referenced by: src/lib/workflowRules.ts

create table if not exists public.workflow_rules (
  id                 bigint generated always as identity primary key,
  rule_name          text,
  rule_type          text,
  entity_type        text,
  condition_key      text,
  condition_operator text,
  condition_value    text,
  action_type        text,
  action_value       text,
  is_active          boolean     default true,
  created_at         timestamptz default timezone('utc', now()),
  updated_at         timestamptz default timezone('utc', now())
);


-- ─── B.7  approval_matrix ────────────────────────────────────────────────────
-- Referenced by: src/lib/approvalMatrix.ts

create table if not exists public.approval_matrix (
  id                 bigint generated always as identity primary key,
  matrix_name        text,
  entity_type        text,
  min_value          numeric,
  max_value          numeric,
  risk_level         text,
  required_role      text,
  required_approvals int         default 1,
  is_active          boolean     default true,
  created_at         timestamptz default timezone('utc', now()),
  updated_at         timestamptz default timezone('utc', now())
);


-- ─── B.8  delegation_authority ───────────────────────────────────────────────
-- Referenced by: src/lib/delegationAuthority.ts

create table if not exists public.delegation_authority (
  id                    bigint generated always as identity primary key,
  user_id               uuid,
  user_email            text,
  role                  text,
  authority_area        text,
  min_value             numeric,
  max_value             numeric,
  can_approve_rfqs      boolean     default false,
  can_approve_awards    boolean     default false,
  can_approve_contracts boolean     default false,
  can_approve_invoices  boolean     default false,
  can_approve_payments  boolean     default false,
  can_approve_overrides boolean     default false,
  is_active             boolean     default true,
  created_at            timestamptz default timezone('utc', now()),
  updated_at            timestamptz default timezone('utc', now())
);


-- ─── B.9  decision_board_items ───────────────────────────────────────────────
-- Referenced by: src/lib/decisionBoard.ts

create table if not exists public.decision_board_items (
  id                 bigint generated always as identity primary key,
  item_type          text,
  entity_id          text,
  title              text,
  description        text,
  requested_by       uuid,
  requested_by_email text,
  decision_status    text        default 'Pending',
  priority           text        default 'Normal',
  decision_notes     text,
  created_at         timestamptz default timezone('utc', now()),
  decided_at         timestamptz
);


-- ─── B.10  whatsapp_alerts ───────────────────────────────────────────────────
-- Referenced by: src/lib/whatsapp.ts, src/lib/automationRules.ts
-- supplier_id and supplier_name confirmed missing from some existing schemas.

create table if not exists public.whatsapp_alerts (
  id             bigint generated always as identity primary key,
  user_id        uuid,
  user_email     text,
  supplier_id    uuid,
  supplier_name  text,
  supplier_phone text,
  alert_type     text,
  message        text,
  rfq_id         bigint,
  metadata       jsonb,
  created_at     timestamptz default timezone('utc', now())
);


-- ─── B.11  rfq_questions ─────────────────────────────────────────────────────
-- Referenced by: src/lib/rfqQuestions.ts

create table if not exists public.rfq_questions (
  id             bigint generated always as identity primary key,
  rfq_id         bigint,
  supplier_id    uuid,
  supplier_email text,
  question       text,
  answer         text,
  answered_at    timestamptz,
  answered_by    uuid,
  created_at     timestamptz default timezone('utc', now())
);


-- ─── B.12  platform_settings ─────────────────────────────────────────────────
-- Referenced by: src/app/dashboard/admin/settings/page.tsx
-- upsert onConflict: "setting_key"
-- setting_value stored as jsonb: { "value": <actual_value> }
-- category and description come from SETTING_DEFINITIONS in the UI.

create table if not exists public.platform_settings (
  id            bigint generated always as identity primary key,
  setting_key   text        unique not null,
  setting_value jsonb,
  category      text,
  description   text,
  created_at    timestamptz default timezone('utc', now()),
  updated_at    timestamptz default timezone('utc', now())
);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION C — SCHEMA COMPATIBILITY                                            │
-- │ Adds columns confirmed missing from existing tables via code analysis.      │
-- │ All statements use ADD COLUMN IF NOT EXISTS — fully safe on new tables too. │
-- └─────────────────────────────────────────────────────────────────────────────┘

-- ─── C.1  profiles ───────────────────────────────────────────────────────────
-- updated_at              : set in demoStories.ts; read in intelligence.ts, supplierRisk.ts
-- banking_verified        : set in demoStories.ts
-- profile_complete        : set in demoStories.ts
-- is_demo                 : used for demo session cleanup
-- banking_verification_status : read in automationRules.ts, supplierRisk.ts
-- cidb_grade              : read in suppliers/[id]/page.tsx, verification/page.tsx
-- verification_notes      : read in suppliers/[id]/page.tsx

alter table public.profiles
  add column if not exists updated_at                  timestamptz default timezone('utc', now()),
  add column if not exists banking_verified            boolean     default false,
  add column if not exists profile_complete            boolean     default false,
  add column if not exists is_demo                     boolean     default false,
  add column if not exists banking_verification_status text,
  add column if not exists cidb_grade                  text,
  add column if not exists verification_notes          text;


-- ─── C.2  purchase_orders ────────────────────────────────────────────────────
-- issue_date    : referenced in demoStories.ts (demo seed alias for generated_at)
-- delivery_date : referenced in demoStories.ts
-- notes         : set in demoStories.ts; displayed in purchase-orders/[id]/page.tsx
-- is_demo       : used for demo session cleanup

alter table public.purchase_orders
  add column if not exists issue_date    timestamptz,
  add column if not exists delivery_date timestamptz,
  add column if not exists notes         text,
  add column if not exists is_demo       boolean default false;


-- ─── C.3  rfqs ───────────────────────────────────────────────────────────────
-- region  : queried in rfq detail page and intelligence/regions page
-- is_demo : used for demo session cleanup

alter table public.rfqs
  add column if not exists region  text,
  add column if not exists is_demo boolean default false;


-- ─── C.4  quotes ─────────────────────────────────────────────────────────────
-- timeline         : read in purchaseOrders.ts (PO creation JOIN)
-- scope            : read in purchaseOrders.ts
-- supporting_notes : read in purchaseOrders.ts as notes source
-- is_demo          : used for demo session cleanup

alter table public.quotes
  add column if not exists timeline         text,
  add column if not exists scope            text,
  add column if not exists supporting_notes text,
  add column if not exists is_demo          boolean default false;


-- ─── C.5  contracts ──────────────────────────────────────────────────────────

alter table public.contracts
  add column if not exists is_demo boolean default false;


-- ─── C.6  invoices ───────────────────────────────────────────────────────────
-- vat   : legacy alias column for vat_amount (read in invoices.ts type Invoice)
-- total : legacy alias column for total_amount (read in invoices.ts type Invoice)
-- rfq_id: referenced in invoices.ts INVOICE_SELECT and intelligence.ts

alter table public.invoices
  add column if not exists vat     text,
  add column if not exists total   text,
  add column if not exists rfq_id  bigint,
  add column if not exists is_demo boolean default false;


-- ─── C.7  payments ───────────────────────────────────────────────────────────

alter table public.payments
  add column if not exists is_demo boolean default false;


-- ─── C.8  whatsapp_alerts ────────────────────────────────────────────────────
-- supplier_id   : inserted in whatsapp.ts logWhatsAppAlert() and automationRules.ts
-- supplier_name : inserted in automationRules.ts

alter table public.whatsapp_alerts
  add column if not exists supplier_id   uuid,
  add column if not exists supplier_name text;


-- ─── C.9  rfq_questions ──────────────────────────────────────────────────────
-- supplier_email : inserted/selected in rfqQuestions.ts
-- answered_by    : set in rfqQuestions.ts answerRFQQuestion()
-- answered_at    : set in rfqQuestions.ts answerRFQQuestion()

alter table public.rfq_questions
  add column if not exists supplier_email text,
  add column if not exists answered_by    uuid,
  add column if not exists answered_at    timestamptz;


-- ─── C.10  messages ──────────────────────────────────────────────────────────
-- quote_id : referenced in messages.ts ProcurementMessage type and sendMessage()

alter table public.messages
  add column if not exists quote_id bigint;


-- ─── C.11  supplier_bank_details ─────────────────────────────────────────────
-- updated_at : general pattern; referenced in bank detail updates

alter table public.supplier_bank_details
  add column if not exists updated_at timestamptz default timezone('utc', now());


-- ─── C.12  buyer_profiles ────────────────────────────────────────────────────

alter table public.buyer_profiles
  add column if not exists updated_at timestamptz default timezone('utc', now());


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION D — INDEXES                                                         │
-- └─────────────────────────────────────────────────────────────────────────────┘

create index if not exists idx_profiles_role                      on public.profiles             (role);
create index if not exists idx_profiles_verification_status       on public.profiles             (verification_status);
create index if not exists idx_rfqs_status                        on public.rfqs                 (status);
create index if not exists idx_rfqs_deadline                      on public.rfqs                 (deadline);
create index if not exists idx_rfqs_created_by                    on public.rfqs                 (created_by);
create index if not exists idx_quotes_rfq_id                      on public.quotes               (rfq_id);
create index if not exists idx_quotes_supplier_id                 on public.quotes               (supplier_id);
create index if not exists idx_quotes_status                      on public.quotes               (status);
create index if not exists idx_purchase_orders_rfq_id             on public.purchase_orders      (rfq_id);
create index if not exists idx_purchase_orders_quote_id           on public.purchase_orders      (quote_id);
create index if not exists idx_purchase_orders_supplier_id        on public.purchase_orders      (supplier_id);
create index if not exists idx_purchase_orders_status             on public.purchase_orders      (status);
create index if not exists idx_contracts_supplier_id              on public.contracts            (supplier_id);
create index if not exists idx_contracts_purchase_order_id        on public.contracts            (purchase_order_id);
create index if not exists idx_contracts_status                   on public.contracts            (status);
create index if not exists idx_contracts_end_date                 on public.contracts            (end_date);
create index if not exists idx_invoices_supplier_id               on public.invoices             (supplier_id);
create index if not exists idx_invoices_contract_id               on public.invoices             (contract_id);
create index if not exists idx_invoices_purchase_order_id         on public.invoices             (purchase_order_id);
create index if not exists idx_invoices_status                    on public.invoices             (status);
create index if not exists idx_payments_invoice_id                on public.payments             (invoice_id);
create index if not exists idx_payments_supplier_id               on public.payments             (supplier_id);
create index if not exists idx_payments_status                    on public.payments             (status);
create index if not exists idx_messages_sender_id                 on public.messages             (sender_id);
create index if not exists idx_messages_receiver_id               on public.messages             (receiver_id);
create index if not exists idx_messages_rfq_id                    on public.messages             (rfq_id);
create index if not exists idx_notifications_recipient_id         on public.notifications        (recipient_id);
create index if not exists idx_notifications_read                 on public.notifications        (read);
create index if not exists idx_audit_logs_entity                  on public.audit_logs           (entity_type, entity_id);
create index if not exists idx_audit_logs_user_email              on public.audit_logs           (user_email);
create index if not exists idx_activity_logs_entity               on public.activity_logs        (entity_type, entity_id);
create index if not exists idx_activity_logs_actor_id             on public.activity_logs        (actor_id);
create index if not exists idx_supplier_reviews_supplier_id       on public.supplier_reviews     (supplier_id);
create index if not exists idx_saved_suppliers_user_id            on public.saved_suppliers      (user_id);
create index if not exists idx_saved_rfqs_user_id                 on public.saved_rfqs           (user_id);
create index if not exists idx_saved_rfqs_rfq_id                  on public.saved_rfqs           (rfq_id);
create index if not exists idx_bank_details_supplier_id           on public.supplier_bank_details (supplier_id);
create index if not exists idx_pilot_requests_status              on public.pilot_requests       (status);
create index if not exists idx_overrides_entity                   on public.procurement_overrides (entity_type, entity_id);
create index if not exists idx_overrides_status                   on public.procurement_overrides (status);
create index if not exists idx_rfq_templates_category             on public.rfq_templates        (category);
create index if not exists idx_rfq_templates_created_by           on public.rfq_templates        (created_by);
create index if not exists idx_workflow_rules_entity_type         on public.workflow_rules       (entity_type);
create index if not exists idx_workflow_rules_is_active           on public.workflow_rules       (is_active);
create index if not exists idx_approval_matrix_entity_type        on public.approval_matrix      (entity_type);
create index if not exists idx_delegation_user_id                 on public.delegation_authority (user_id);
create index if not exists idx_delegation_is_active               on public.delegation_authority (is_active);
create index if not exists idx_decision_board_status              on public.decision_board_items (decision_status);
create index if not exists idx_decision_board_item_type           on public.decision_board_items (item_type);
create index if not exists idx_whatsapp_supplier_id               on public.whatsapp_alerts      (supplier_id);
create index if not exists idx_whatsapp_rfq_id                    on public.whatsapp_alerts      (rfq_id);
create index if not exists idx_rfq_questions_rfq_id               on public.rfq_questions        (rfq_id);
create index if not exists idx_rfq_questions_supplier_id          on public.rfq_questions        (supplier_id);
create index if not exists idx_platform_settings_key              on public.platform_settings    (setting_key);
create index if not exists idx_platform_settings_category         on public.platform_settings    (category);


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION E — ROW LEVEL SECURITY                                              │
-- │ Enable RLS on every table.                                                  │
-- │ Add permissive development-safe policies (true predicates).                 │
-- │ TODO: Replace (true) predicates with user-scoped conditions before prod.    │
-- └─────────────────────────────────────────────────────────────────────────────┘

alter table public.profiles              enable row level security;
alter table public.rfqs                  enable row level security;
alter table public.quotes                enable row level security;
alter table public.purchase_orders       enable row level security;
alter table public.contracts             enable row level security;
alter table public.invoices              enable row level security;
alter table public.payments              enable row level security;
alter table public.messages              enable row level security;
alter table public.notifications         enable row level security;
alter table public.audit_logs            enable row level security;
alter table public.activity_logs         enable row level security;
alter table public.supplier_reviews      enable row level security;
alter table public.saved_suppliers       enable row level security;
alter table public.buyer_profiles        enable row level security;
alter table public.saved_rfqs            enable row level security;
alter table public.supplier_bank_details enable row level security;
alter table public.pilot_requests        enable row level security;
alter table public.procurement_overrides enable row level security;
alter table public.rfq_templates         enable row level security;
alter table public.workflow_rules        enable row level security;
alter table public.approval_matrix       enable row level security;
alter table public.delegation_authority  enable row level security;
alter table public.decision_board_items  enable row level security;
alter table public.whatsapp_alerts       enable row level security;
alter table public.rfq_questions         enable row level security;
alter table public.platform_settings     enable row level security;

-- ─── Policy helper ────────────────────────────────────────────────────────────

-- profiles
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='dev_profiles_select') then execute 'create policy "dev_profiles_select" on public.profiles for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='dev_profiles_insert') then execute 'create policy "dev_profiles_insert" on public.profiles for insert with check (true)'; end if; end $$; -- TODO: with check (auth.uid() = id)
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='dev_profiles_update') then execute 'create policy "dev_profiles_update" on public.profiles for update using (true)'; end if; end $$; -- TODO: using (auth.uid() = id)

-- rfqs
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfqs' and policyname='dev_rfqs_select') then execute 'create policy "dev_rfqs_select" on public.rfqs for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfqs' and policyname='dev_rfqs_insert') then execute 'create policy "dev_rfqs_insert" on public.rfqs for insert with check (true)'; end if; end $$; -- TODO: admin/buyer role only
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfqs' and policyname='dev_rfqs_update') then execute 'create policy "dev_rfqs_update" on public.rfqs for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfqs' and policyname='dev_rfqs_delete') then execute 'create policy "dev_rfqs_delete" on public.rfqs for delete using (true)'; end if; end $$;

-- quotes
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='quotes' and policyname='dev_quotes_select') then execute 'create policy "dev_quotes_select" on public.quotes for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='quotes' and policyname='dev_quotes_insert') then execute 'create policy "dev_quotes_insert" on public.quotes for insert with check (true)'; end if; end $$; -- TODO: auth.uid() = supplier_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='quotes' and policyname='dev_quotes_update') then execute 'create policy "dev_quotes_update" on public.quotes for update using (true)'; end if; end $$;

-- purchase_orders
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_orders' and policyname='dev_po_select') then execute 'create policy "dev_po_select" on public.purchase_orders for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_orders' and policyname='dev_po_insert') then execute 'create policy "dev_po_insert" on public.purchase_orders for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='purchase_orders' and policyname='dev_po_update') then execute 'create policy "dev_po_update" on public.purchase_orders for update using (true)'; end if; end $$;

-- contracts
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='contracts' and policyname='dev_contracts_select') then execute 'create policy "dev_contracts_select" on public.contracts for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='contracts' and policyname='dev_contracts_insert') then execute 'create policy "dev_contracts_insert" on public.contracts for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='contracts' and policyname='dev_contracts_update') then execute 'create policy "dev_contracts_update" on public.contracts for update using (true)'; end if; end $$;

-- invoices
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='dev_invoices_select') then execute 'create policy "dev_invoices_select" on public.invoices for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='dev_invoices_insert') then execute 'create policy "dev_invoices_insert" on public.invoices for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='invoices' and policyname='dev_invoices_update') then execute 'create policy "dev_invoices_update" on public.invoices for update using (true)'; end if; end $$;

-- payments
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='dev_payments_select') then execute 'create policy "dev_payments_select" on public.payments for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='dev_payments_insert') then execute 'create policy "dev_payments_insert" on public.payments for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='payments' and policyname='dev_payments_update') then execute 'create policy "dev_payments_update" on public.payments for update using (true)'; end if; end $$;

-- messages
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='dev_messages_select') then execute 'create policy "dev_messages_select" on public.messages for select using (true)'; end if; end $$; -- TODO: auth.uid() in (sender_id, receiver_id)
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='dev_messages_insert') then execute 'create policy "dev_messages_insert" on public.messages for insert with check (true)'; end if; end $$; -- TODO: auth.uid() = sender_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='messages' and policyname='dev_messages_update') then execute 'create policy "dev_messages_update" on public.messages for update using (true)'; end if; end $$;

-- notifications
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='dev_notifications_select') then execute 'create policy "dev_notifications_select" on public.notifications for select using (true)'; end if; end $$; -- TODO: auth.uid() = recipient_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='dev_notifications_insert') then execute 'create policy "dev_notifications_insert" on public.notifications for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='dev_notifications_update') then execute 'create policy "dev_notifications_update" on public.notifications for update using (true)'; end if; end $$; -- TODO: auth.uid() = recipient_id

-- audit_logs
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='dev_audit_select') then execute 'create policy "dev_audit_select" on public.audit_logs for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='audit_logs' and policyname='dev_audit_insert') then execute 'create policy "dev_audit_insert" on public.audit_logs for insert with check (true)'; end if; end $$;

-- activity_logs
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_logs' and policyname='dev_activity_select') then execute 'create policy "dev_activity_select" on public.activity_logs for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='activity_logs' and policyname='dev_activity_insert') then execute 'create policy "dev_activity_insert" on public.activity_logs for insert with check (true)'; end if; end $$;

-- supplier_reviews
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_reviews' and policyname='dev_reviews_select') then execute 'create policy "dev_reviews_select" on public.supplier_reviews for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_reviews' and policyname='dev_reviews_insert') then execute 'create policy "dev_reviews_insert" on public.supplier_reviews for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_reviews' and policyname='dev_reviews_update') then execute 'create policy "dev_reviews_update" on public.supplier_reviews for update using (true)'; end if; end $$;

-- saved_suppliers
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_suppliers' and policyname='dev_saved_suppliers_select') then execute 'create policy "dev_saved_suppliers_select" on public.saved_suppliers for select using (true)'; end if; end $$; -- TODO: auth.uid() = user_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_suppliers' and policyname='dev_saved_suppliers_insert') then execute 'create policy "dev_saved_suppliers_insert" on public.saved_suppliers for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_suppliers' and policyname='dev_saved_suppliers_delete') then execute 'create policy "dev_saved_suppliers_delete" on public.saved_suppliers for delete using (true)'; end if; end $$; -- TODO: auth.uid() = user_id

-- buyer_profiles
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='buyer_profiles' and policyname='dev_buyer_profiles_select') then execute 'create policy "dev_buyer_profiles_select" on public.buyer_profiles for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='buyer_profiles' and policyname='dev_buyer_profiles_insert') then execute 'create policy "dev_buyer_profiles_insert" on public.buyer_profiles for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='buyer_profiles' and policyname='dev_buyer_profiles_update') then execute 'create policy "dev_buyer_profiles_update" on public.buyer_profiles for update using (true)'; end if; end $$;

-- saved_rfqs
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_rfqs' and policyname='dev_saved_rfqs_select') then execute 'create policy "dev_saved_rfqs_select" on public.saved_rfqs for select using (true)'; end if; end $$; -- TODO: auth.uid() = user_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_rfqs' and policyname='dev_saved_rfqs_insert') then execute 'create policy "dev_saved_rfqs_insert" on public.saved_rfqs for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='saved_rfqs' and policyname='dev_saved_rfqs_delete') then execute 'create policy "dev_saved_rfqs_delete" on public.saved_rfqs for delete using (true)'; end if; end $$; -- TODO: auth.uid() = user_id

-- supplier_bank_details
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_bank_details' and policyname='dev_banking_select') then execute 'create policy "dev_banking_select" on public.supplier_bank_details for select using (true)'; end if; end $$; -- TODO: auth.uid() = supplier_id OR admin
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_bank_details' and policyname='dev_banking_insert') then execute 'create policy "dev_banking_insert" on public.supplier_bank_details for insert with check (true)'; end if; end $$; -- TODO: auth.uid() = supplier_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='supplier_bank_details' and policyname='dev_banking_update') then execute 'create policy "dev_banking_update" on public.supplier_bank_details for update using (true)'; end if; end $$; -- TODO: auth.uid() = supplier_id OR admin

-- pilot_requests
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='pilot_requests' and policyname='dev_pilot_select') then execute 'create policy "dev_pilot_select" on public.pilot_requests for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='pilot_requests' and policyname='dev_pilot_insert') then execute 'create policy "dev_pilot_insert" on public.pilot_requests for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='pilot_requests' and policyname='dev_pilot_update') then execute 'create policy "dev_pilot_update" on public.pilot_requests for update using (true)'; end if; end $$;

-- procurement_overrides
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_overrides' and policyname='dev_overrides_select') then execute 'create policy "dev_overrides_select" on public.procurement_overrides for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_overrides' and policyname='dev_overrides_insert') then execute 'create policy "dev_overrides_insert" on public.procurement_overrides for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='procurement_overrides' and policyname='dev_overrides_update') then execute 'create policy "dev_overrides_update" on public.procurement_overrides for update using (true)'; end if; end $$;

-- rfq_templates
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_templates' and policyname='dev_templates_select') then execute 'create policy "dev_templates_select" on public.rfq_templates for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_templates' and policyname='dev_templates_insert') then execute 'create policy "dev_templates_insert" on public.rfq_templates for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_templates' and policyname='dev_templates_update') then execute 'create policy "dev_templates_update" on public.rfq_templates for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_templates' and policyname='dev_templates_delete') then execute 'create policy "dev_templates_delete" on public.rfq_templates for delete using (true)'; end if; end $$;

-- workflow_rules
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_rules' and policyname='dev_workflow_select') then execute 'create policy "dev_workflow_select" on public.workflow_rules for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_rules' and policyname='dev_workflow_insert') then execute 'create policy "dev_workflow_insert" on public.workflow_rules for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_rules' and policyname='dev_workflow_update') then execute 'create policy "dev_workflow_update" on public.workflow_rules for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='workflow_rules' and policyname='dev_workflow_delete') then execute 'create policy "dev_workflow_delete" on public.workflow_rules for delete using (true)'; end if; end $$;

-- approval_matrix
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='approval_matrix' and policyname='dev_matrix_select') then execute 'create policy "dev_matrix_select" on public.approval_matrix for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='approval_matrix' and policyname='dev_matrix_insert') then execute 'create policy "dev_matrix_insert" on public.approval_matrix for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='approval_matrix' and policyname='dev_matrix_update') then execute 'create policy "dev_matrix_update" on public.approval_matrix for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='approval_matrix' and policyname='dev_matrix_delete') then execute 'create policy "dev_matrix_delete" on public.approval_matrix for delete using (true)'; end if; end $$;

-- delegation_authority
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='delegation_authority' and policyname='dev_delegation_select') then execute 'create policy "dev_delegation_select" on public.delegation_authority for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='delegation_authority' and policyname='dev_delegation_insert') then execute 'create policy "dev_delegation_insert" on public.delegation_authority for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='delegation_authority' and policyname='dev_delegation_update') then execute 'create policy "dev_delegation_update" on public.delegation_authority for update using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='delegation_authority' and policyname='dev_delegation_delete') then execute 'create policy "dev_delegation_delete" on public.delegation_authority for delete using (true)'; end if; end $$;

-- decision_board_items
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='decision_board_items' and policyname='dev_decision_select') then execute 'create policy "dev_decision_select" on public.decision_board_items for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='decision_board_items' and policyname='dev_decision_insert') then execute 'create policy "dev_decision_insert" on public.decision_board_items for insert with check (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='decision_board_items' and policyname='dev_decision_update') then execute 'create policy "dev_decision_update" on public.decision_board_items for update using (true)'; end if; end $$;

-- whatsapp_alerts
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_alerts' and policyname='dev_whatsapp_select') then execute 'create policy "dev_whatsapp_select" on public.whatsapp_alerts for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='whatsapp_alerts' and policyname='dev_whatsapp_insert') then execute 'create policy "dev_whatsapp_insert" on public.whatsapp_alerts for insert with check (true)'; end if; end $$;

-- rfq_questions
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_questions' and policyname='dev_questions_select') then execute 'create policy "dev_questions_select" on public.rfq_questions for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_questions' and policyname='dev_questions_insert') then execute 'create policy "dev_questions_insert" on public.rfq_questions for insert with check (true)'; end if; end $$; -- TODO: auth.uid() = supplier_id
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='rfq_questions' and policyname='dev_questions_update') then execute 'create policy "dev_questions_update" on public.rfq_questions for update using (true)'; end if; end $$; -- TODO: admin/buyer only for answers

-- platform_settings
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_settings' and policyname='dev_settings_select') then execute 'create policy "dev_settings_select" on public.platform_settings for select using (true)'; end if; end $$;
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_settings' and policyname='dev_settings_insert') then execute 'create policy "dev_settings_insert" on public.platform_settings for insert with check (true)'; end if; end $$; -- TODO: admin role only
do $$ begin if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_settings' and policyname='dev_settings_update') then execute 'create policy "dev_settings_update" on public.platform_settings for update using (true)'; end if; end $$; -- TODO: admin role only


-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │ SECTION F — STORAGE BUCKETS                                                 │
-- │ Cannot be created via SQL. Must be created in Supabase Dashboard.           │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- Required storage buckets (Supabase Dashboard → Storage → New bucket):
--
--   1.  supplier-documents   (private)
--       Used by: src/app/dashboard/verification/page.tsx
--         supabase.storage.from("supplier-documents").upload(...)
--
--   2.  rfq-documents        (private)
--       Used by: src/app/dashboard/admin/rfqs/[id]/document-pack/page.tsx
--
-- After creating each bucket, set Storage policies
-- (Dashboard → Storage → [bucket] → Policies):
--
--   supplier-documents:
--     SELECT (authenticated) : bucket_id = 'supplier-documents'
--     INSERT (authenticated) : bucket_id = 'supplier-documents'
--     UPDATE (authenticated) : bucket_id = 'supplier-documents'
--
--   rfq-documents:
--     SELECT (authenticated) : bucket_id = 'rfq-documents'
--     INSERT (authenticated) : bucket_id = 'rfq-documents'
--
-- Server-side creation (service-role key required):
--   await supabaseAdmin.storage.createBucket('supplier-documents', { public: false })
--   await supabaseAdmin.storage.createBucket('rfq-documents',      { public: false })
--
-- ═══════════════════════════════════════════════════════════════════════════════
-- End of enterprise_stabilization.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Summary:
--   Tables   : 26 (14 core + 12 enterprise)
--   Columns  : 30+ added via ALTER TABLE ADD COLUMN IF NOT EXISTS
--   Indexes  : 54
--   Policies : ~90 (SELECT / INSERT / UPDATE / DELETE per table)
-- ═══════════════════════════════════════════════════════════════════════════════
