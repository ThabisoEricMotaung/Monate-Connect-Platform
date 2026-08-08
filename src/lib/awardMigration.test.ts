import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const root = resolve(__dirname, "../..")
const migration = readFileSync(
  resolve(root, "supabase/migrations/20260808123139_phase3a_award_transaction_integrity.sql"),
  "utf8",
)
const comparisonPage = readFileSync(
  resolve(root, "src/app/dashboard/admin/rfqs/[id]/quotes/page.tsx"),
  "utf8",
)
const purchaseOrders = readFileSync(resolve(root, "src/lib/purchaseOrders.ts"), "utf8")
const restorePolicies = readFileSync(
  resolve(root, "database/migrations/restore_test_apply_production_rls.sql"),
  "utf8",
)

describe("Phase 3A award transaction boundary", () => {
  it("defines locked, authenticated award and PO RPCs", () => {
    expect(migration).toContain("create function public.award_rfq_quote")
    expect(migration).toContain("create function public.create_purchase_order_for_award")
    expect(migration).toMatch(/security definer set search_path = ''/)
    expect(migration).toContain("v_actor_id uuid := (select auth.uid())")
    expect(migration).toContain("for update")
    expect(migration).toContain("grant execute on function public.award_rfq_quote")
    expect(migration).toContain("grant execute on function public.create_purchase_order_for_award")
  })

  it("enforces one winner and idempotent PO source keys", () => {
    expect(migration).toContain("quotes_one_awarded_per_rfq_idx")
    expect(migration).toContain("purchase_orders_quote_id_key")
    expect(migration).toContain("purchase_orders_rfq_id_key")
    expect(migration).toContain("purchase_orders_po_number_key")
    expect(migration).toContain("purchase_order_number_seq")
  })

  it("guards direct award transitions and direct PO inserts", () => {
    expect(migration).toContain("quotes_guard_award_status_transition")
    expect(migration).toContain("Award status transitions must use award_rfq_quote()")
    expect(migration).toContain("drop policy if exists po_insert")
    expect(migration).toContain("revoke insert on public.purchase_orders from authenticated")
    expect(restorePolicies).toContain("drop policy if exists po_insert")
    expect(restorePolicies).toContain("revoke insert on public.purchase_orders from authenticated")
  })

  it("uses the actual production notification and WhatsApp projections", () => {
    expect(migration).toContain("public.notifications (user_id,title,message,type,link,is_read)")
    expect(migration).toContain("public.whatsapp_alerts (user_id,supplier_id,phone,alert_type,title,message,link,status)")
    expect(migration).toContain("'Quote Not Awarded'")
  })

  it("keeps legacy source constraints provisional", () => {
    expect(migration).toContain("purchase_orders_quote_rfq_fkey")
    expect(migration.match(/not valid/g)?.length).toBe(3)
    expect(migration).not.toMatch(/update\s+public\.purchase_orders/i)
    expect(migration).not.toMatch(/delete\s+from\s+public\.purchase_orders/i)
  })

  it("routes both browser mutations through the RPCs", () => {
    expect(comparisonPage).toContain('supabase.rpc("award_rfq_quote"')
    expect(comparisonPage).not.toContain('.update({ status: "Awarded" })')
    expect(purchaseOrders).toContain('supabase.rpc("create_purchase_order_for_award"')
    expect(purchaseOrders).not.toContain('.from("purchase_orders")\n    .insert')
  })
})
