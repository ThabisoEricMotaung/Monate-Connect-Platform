import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const sql = readFileSync("supabase/migrations/20260804080949_smartscore_phase2_review_workflow.sql", "utf8")
const expirySql = readFileSync("supabase/migrations/20260806090000_supplier_document_expiry_phase1.sql", "utf8")
const complianceExpirySql = readFileSync("supabase/migrations/20260806150000_compliance_expiry_phase2.sql", "utf8")
const passportStatusSql = readFileSync("supabase/migrations/20260808060141_supplier_passport_self_reported_status.sql", "utf8")

describe("atomic review migration", () => {
  it("refreshes derived state inside the review transaction", () => {
    expect(sql).toContain("v_refresh := public.refresh_supplier_verification")
  })
  it("creates the audit record in the same function", () => {
    expect(sql).toMatch(/create or replace function public\.review_supplier_document[\s\S]*insert into public\.audit_logs/)
  })
})

describe("Phase 1 supplier document expiry migration", () => {
  it("adds expiry_date to supplier_documents", () => {
    expect(expirySql).toContain("add column if not exists expiry_date date")
  })
  it("drops the old review_supplier_document overload before replacing it", () => {
    expect(expirySql).toMatch(
      /drop function if exists public\.review_supplier_document\(uuid, uuid, text, timestamptz, text, text\);[\s\S]*create or replace function public\.review_supplier_document/,
    )
  })
  it("persists p_expiry_date without clobbering an existing value when omitted", () => {
    expect(expirySql).toContain("expiry_date = coalesce(p_expiry_date, v_document.expiry_date)")
  })
  it("excludes expired csd/bbbee/tax_clearance documents from compliance scoring", () => {
    expect(expirySql).toMatch(
      /d\.document_type not in \('csd', 'bbbee', 'tax_clearance'\)\s*\n\s*or d\.expiry_date is null\s*\n\s*or d\.expiry_date >= current_date/,
    )
  })
  it("does not gate bank_letter compliance points on expiry_date", () => {
    const bankLetterClause = expirySql.match(/document_type = 'bank_letter'\), false\) then 10 else 0 end\)/)
    expect(bankLetterClause).not.toBeNull()
  })
})

describe("Phase 2 compliance expiry migration", () => {
  it("creates the notification dedup table with a per-window unique constraint", () => {
    expect(complianceExpirySql).toContain("create table public.compliance_expiry_notifications")
    expect(complianceExpirySql).toContain("unique (record_type, record_id, window_days, notified_for_date)")
  })
  it("restricts record_type to the four known compliance-expiry sources", () => {
    expect(complianceExpirySql).toContain(
      "record_type in ('supplier_document', 'supplier_certification', 'supplier_licence', 'contract')",
    )
  })
  it("restricts window_days to exactly 30/14/1", () => {
    expect(complianceExpirySql).toContain("check (window_days in (30, 14, 1))")
  })
  it("lets admin/reviewer authenticated sessions read and write the dedup table", () => {
    expect(complianceExpirySql).toMatch(/lower\(trim\(coalesce\(reviewer\.role, ''\)\)\) in \('admin', 'reviewer'\)/)
    expect(complianceExpirySql).toContain("grant select, insert on public.compliance_expiry_notifications to authenticated")
  })
  it("expires Verified certifications and licences only once expiry_date has passed", () => {
    expect(complianceExpirySql).toMatch(
      /from public\.supplier_certifications\s*\n\s*where status = 'Verified'\s*\n\s*and expiry_date is not null\s*\n\s*and expiry_date < current_date/,
    )
    expect(complianceExpirySql).toMatch(
      /from public\.supplier_licences\s*\n\s*where status = 'Verified'\s*\n\s*and expiry_date is not null\s*\n\s*and expiry_date < current_date/,
    )
  })
  it("audit-logs each expiry transition", () => {
    expect(complianceExpirySql).toContain("'supplier_certification.expired'")
    expect(complianceExpirySql).toContain("'supplier_licence.expired'")
  })
  it("restricts execute to service_role, same as expire_verification_attestations", () => {
    expect(complianceExpirySql).toContain(
      "revoke execute on function public.expire_supplier_passport_records() from public, anon, authenticated",
    )
    expect(complianceExpirySql).toContain("grant execute on function public.expire_supplier_passport_records() to service_role")
  })
})

describe("supplier Passport self-reported status migration", () => {
  it("changes both defaults and constraints from Missing to Self-reported", () => {
    expect(passportStatusSql.match(/alter column status set default 'Self-reported'/g)).toHaveLength(2)
    expect(passportStatusSql).toContain("check (status in ('Self-reported', 'Verified', 'Pending review', 'Rejected', 'Expired'))")
  })

  it("backfills active Missing rows and directly expires past rows", () => {
    expect(passportStatusSql.match(/when expiry_date is not null and expiry_date < current_date then 'Expired'/g)).toHaveLength(2)
    expect(passportStatusSql.match(/where status = 'Missing'/g)).toHaveLength(2)
  })

  it("forces supplier-owned writes back to a non-reviewed status", () => {
    expect(passportStatusSql).toMatch(/v_user_id = new\.profile_id[\s\S]*new\.status := case/)
    expect(passportStatusSql).toContain("new.reviewed_by := null")
    expect(passportStatusSql).toContain("new.reviewed_at := null")
    expect(passportStatusSql.match(/before insert or update on public\.supplier_/g)).toHaveLength(2)
  })

  it("expires both Verified and Self-reported active records", () => {
    expect(passportStatusSql.match(/where status in \('Verified', 'Self-reported'\)/g)).toHaveLength(2)
  })

  it("keeps the expiry function restricted to service_role", () => {
    expect(passportStatusSql).toContain(
      "revoke execute on function public.expire_supplier_passport_records()\n  from public, anon, authenticated",
    )
    expect(passportStatusSql).toContain("grant execute on function public.expire_supplier_passport_records() to service_role")
  })
})
