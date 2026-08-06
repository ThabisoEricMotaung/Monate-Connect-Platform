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

function reset(
  role = "admin",
  documentStatus = "under_review",
  fileUrl: string | null = "https://evidence.test/doc.pdf",
  expiryDate: string | null = null,
) {
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
      (id, profile_id, document_type, file_url, status, uploaded_at, expiry_date)
    values
      ('${documentId}', '${supplierId}', 'csd', ${fileUrl === null ? "null" : `'${fileUrl}'`}, '${documentStatus}', now(), ${expiryDate === null ? "null" : `'${expiryDate}'`});
  `)
}

function review(
  decision: "approved" | "rejected" | "under_review",
  expectedStatus: string,
  expectedReviewedAt = "null",
  expiryDate: string | null = null,
) {
  return sql(`select public.review_supplier_document(
    '${documentId}', '${reviewerId}', '${expectedStatus}', ${expectedReviewedAt}, '${decision}', 'database test',
    ${expiryDate === null ? "null" : `'${expiryDate}'`}
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

  it("stores the expiry date supplied at approval", () => {
    reset()
    review("approved", "under_review", "null", "2030-01-01")
    expect(sql(`select expiry_date::text from public.supplier_documents where id='${documentId}'`)).toBe("2030-01-01")
  })

  it("leaves an existing expiry date untouched when the reviewer omits it", () => {
    reset("admin", "under_review", "https://evidence.test/doc.pdf", "2030-01-01")
    review("approved", "under_review")
    expect(sql(`select expiry_date::text from public.supplier_documents where id='${documentId}'`)).toBe("2030-01-01")
  })

  it("excludes an expired approved csd document from compliance scoring", () => {
    reset("admin", "under_review", "https://evidence.test/doc.pdf", "2020-01-01")
    review("approved", "under_review")
    expect(sql(`select smart_score::text from public.profiles where id='${supplierId}'`)).toBe("20")
  })

  it("counts a not-yet-expired approved csd document toward compliance scoring", () => {
    reset("admin", "under_review", "https://evidence.test/doc.pdf", "2030-01-01")
    review("approved", "under_review")
    expect(sql(`select smart_score::text from public.profiles where id='${supplierId}'`)).toBe("40")
  })

  it("a pre-existing approved document with no expiry_date still counts as compliant (deploy is inert)", () => {
    reset("admin", "approved", "https://evidence.test/doc.pdf", null)
    expect(sql(`select public.supplier_compliance_base('${supplierId}')::text`)).toBe("40")
  })
})

describeDatabase.sequential("expire_supplier_passport_records", () => {
  function resetPassportRecords(
    certExpiry: string | null,
    certStatus = "Verified",
    licenceExpiry: string | null = null,
    licenceStatus = "Verified",
  ) {
    reset()
    sql(`
      insert into public.supplier_certifications (profile_id, name, expiry_date, status)
      values ('${supplierId}', 'ISO 9001', ${certExpiry === null ? "null" : `'${certExpiry}'`}, '${certStatus}');
      insert into public.supplier_licences (profile_id, licence_type, expiry_date, status)
      values ('${supplierId}', 'Operating Licence', ${licenceExpiry === null ? "null" : `'${licenceExpiry}'`}, '${licenceStatus}');
    `)
  }

  it("expires a Verified certification past its expiry_date", () => {
    resetPassportRecords("2020-01-01")
    sql("select public.expire_supplier_passport_records();")
    expect(sql(`select status from public.supplier_certifications where profile_id='${supplierId}'`)).toBe("Expired")
  })

  it("expires a Verified licence past its expiry_date", () => {
    resetPassportRecords(null, "Verified", "2020-01-01")
    sql("select public.expire_supplier_passport_records();")
    expect(sql(`select status from public.supplier_licences where profile_id='${supplierId}'`)).toBe("Expired")
  })

  it("leaves a not-yet-expired Verified certification untouched", () => {
    resetPassportRecords("2099-01-01")
    sql("select public.expire_supplier_passport_records();")
    expect(sql(`select status from public.supplier_certifications where profile_id='${supplierId}'`)).toBe("Verified")
  })

  it("leaves a null expiry_date untouched (deploy is inert for existing data)", () => {
    resetPassportRecords(null)
    sql("select public.expire_supplier_passport_records();")
    expect(sql(`select status from public.supplier_certifications where profile_id='${supplierId}'`)).toBe("Verified")
  })

  it("does not touch a non-Verified status even if its expiry_date has passed", () => {
    resetPassportRecords("2020-01-01", "Pending review")
    sql("select public.expire_supplier_passport_records();")
    expect(sql(`select status from public.supplier_certifications where profile_id='${supplierId}'`)).toBe("Pending review")
  })

  it("audit-logs each expiry transition", () => {
    resetPassportRecords("2020-01-01")
    sql("select public.expire_supplier_passport_records();")
    expect(
      sql(`select count(*)::text from public.audit_logs where action='supplier_certification.expired'`),
    ).toBe("1")
  })

  it("returns a count of both tables in one call", () => {
    resetPassportRecords("2020-01-01", "Verified", "2020-01-01")
    expect(
      sql(`
        select (result->>'certifications_expired') || ':' || (result->>'licences_expired')
        from (select public.expire_supplier_passport_records() as result) s;
      `),
    ).toBe("1:1")
  })
})
