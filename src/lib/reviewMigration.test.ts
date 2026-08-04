import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const sql = readFileSync("supabase/migrations/20260804080949_smartscore_phase2_review_workflow.sql", "utf8")

describe("atomic review migration", () => {
  it("refreshes derived state inside the review transaction", () => {
    expect(sql).toContain("v_refresh := public.refresh_supplier_verification")
  })
  it("creates the audit record in the same function", () => {
    expect(sql).toMatch(/create or replace function public\.review_supplier_document[\s\S]*insert into public\.audit_logs/)
  })
})
