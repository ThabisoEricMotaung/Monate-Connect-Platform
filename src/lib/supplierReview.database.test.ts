import { execFileSync } from "node:child_process"
import { describe, expect, it } from "vitest"

const databaseUrl = process.env.PHASE2_TEST_DATABASE_URL
const psql = process.env.PSQL_PATH ?? "psql"
const describeDatabase = databaseUrl ? describe : describe.skip

const reviewerId = "00000000-0000-0000-0000-000000000001"
const supplierId = "00000000-0000-0000-0000-000000000002"
const documentId = "00000000-0000-0000-0000-000000000003"

function sql(statement: string): string {
  if (!databaseUrl) throw new Error("PHASE2_TEST_DATABASE_URL is required")
  return execFileSync(psql, [databaseUrl, "-X", "-v", "ON_ERROR_STOP=1", "-At", "-c", statement], {
    encoding: "utf8",
  }).trim()
}

function reset(role = "admin", documentStatus = "under_review", fileUrl: string | null = "https://evidence.test/doc.pdf") {
  sql(`
    truncate public.audit_logs, public.verification_attestations, public.supplier_documents, public.profiles, auth.users restart identity cascade;
    insert into auth.users (id, email) values
      ('${reviewerId}', 'reviewer@example.test'),
      ('${supplierId}', 'supplier@example.test');
    insert into public.profiles
      (id, role, email, business_name, industry, province, provinces, phone, description, bbbee_level, verification_status, smart_score)
    values
      ('${reviewerId}', '${role}', 'reviewer@example.test', 'Reviewer', 'Services', 'Gauteng', null, '0100000000', 'Reviewer', '1', 'Pending Review', 20),
      ('${supplierId}', 'supplier', 'supplier@example.test', 'Supplier', 'Services', 'Gauteng', null, '0100000001', 'Supplier description', '1', 'Pending Review', 20);
    insert into public.supplier_documents
      (id, profile_id, document_type, file_url, status, uploaded_at)
    values
      ('${documentId}', '${supplierId}', 'csd', ${fileUrl === null ? "null" : `'${fileUrl}'`}, '${documentStatus}', now());
  `)
}

function review(decision: "approved" | "rejected" | "under_review", expectedStatus: string, expectedReviewedAt = "null") {
  return sql(`select public.review_supplier_document(
    '${documentId}', '${reviewerId}', '${expectedStatus}', ${expectedReviewedAt}, '${decision}', 'database test'
  )::text;`)
}

describeDatabase.sequential("database-backed Phase 2 review workflow", () => {
  it("approves evidence and records reviewed_by", () => {
    reset()
    review("approved", "under_review")
    expect(sql(`select status || ':' || reviewed_by from public.supplier_documents where id='${documentId}'`))
      .toBe(`approved:${reviewerId}`)
  })

  it("rejects evidence", () => {
    reset()
    review("rejected", "under_review")
    expect(sql(`select status from public.supplier_documents where id='${documentId}'`)).toBe("rejected")
  })

  it("revokes approval back to review", () => {
    reset("admin", "approved")
    sql(`update public.supplier_documents set reviewed_at=now(), reviewed_by='${reviewerId}' where id='${documentId}'`)
    const reviewedAt = sql(`select reviewed_at::text from public.supplier_documents where id='${documentId}'`)
    review("under_review", "approved", `'${reviewedAt}'::timestamptz`)
    expect(sql(`select status from public.supplier_documents where id='${documentId}'`)).toBe("under_review")
  })

  it("refuses approval without document evidence", () => {
    reset("admin", "under_review", null)
    expect(() => review("approved", "under_review")).toThrow(/Document evidence is required/)
  })

  it("refuses a caller without reviewer authorization", () => {
    reset("supplier")
    expect(() => review("approved", "under_review")).toThrow(/Reviewer role required/)
  })

  it("rejects a stale concurrent review", () => {
    reset()
    review("approved", "under_review")
    expect(() => review("rejected", "under_review")).toThrow(/Stale document review/)
    expect(sql(`select status from public.supplier_documents where id='${documentId}'`)).toBe("approved")
  })

  it("refreshes profile SmartScore and derived verification status", () => {
    reset()
    review("approved", "under_review")
    expect(sql(`select smart_score::text || ':' || verification_status from public.profiles where id='${supplierId}'`))
      .toBe("40:Pending Review")
  })

  it("creates an audit row atomically", () => {
    reset()
    review("approved", "under_review")
    expect(sql(`select count(*)::text from public.audit_logs where action='supplier_document.reviewed' and entity_id='${documentId}'`)).toBe("1")
  })

  it("approves a director attestation with evidence", () => {
    reset()
    sql(`select public.review_verification_attestation(
      '${supplierId}', '${reviewerId}', 'director', 'approved', 'Registry verified', 'CIPC-123', now() + interval '1 year', null
    );`)
    expect(sql(`select decision || ':' || reviewed_by from public.verification_attestations where profile_id='${supplierId}'`))
      .toBe(`approved:${reviewerId}`)
  })

  it("expires the latest director attestation and refreshes derived score", () => {
    reset()
    sql(`select public.review_verification_attestation(
      '${supplierId}', '${reviewerId}', 'director', 'approved', 'Registry verified', 'CIPC-123', now() + interval '1 year', null
    );`)
    sql(`update public.verification_attestations set reviewed_at=now()-interval '2 days', expires_at=now()-interval '1 day' where profile_id='${supplierId}'`)
    sql("select public.expire_verification_attestations();")
    expect(sql(`select decision from public.verification_attestations where profile_id='${supplierId}'`)).toBe("expired")
    expect(sql(`select smart_score::text from public.profiles where id='${supplierId}'`)).toBe("20")
  })
})
