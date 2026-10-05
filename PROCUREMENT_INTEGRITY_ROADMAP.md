# Procurement Integrity Features Roadmap
## Related-Enterprise Graph & Contextual Performance Records
**Timeline:** 5–7 weeks | **Status:** Implementation started Oct 5, 2026

---

## Overview

Two major features to implement in response to September 2026 procurement intelligence brief:

### 1. **Related-Enterprise Graph** (Task #17)
Allow suppliers to disclose linked directors, beneficial owners, and related enterprises with evidence provenance. Validates supplier transparency while preventing conflicts of interest.

**Aligns with:** CIPC beneficial-ownership access (law-enforcement module validates the graph concept)

### 2. **Contextual Performance Records** (Task #18)
Track supplier performance concerns with full context: buyer evidence, supplier response, corrective actions, admin assessment. Supports Bergstan court judgment: poor performance is relevant but not automatically disqualifying.

**Aligns with:** Bergstan v City of Cape Town judgment (Sept 30, 2026)

---

## Week-by-Week Implementation Plan

### **Weeks 1–2: Data Modeling & Content (Oct 5–18)**

#### Database Migrations
- [x] `create_related_entities_schema.sql` — supplier_related_entities, enterprise_links tables
- [x] `create_performance_records_schema.sql` — performance_records, performance_responses, performance_resolution tables
- [ ] Run migrations on Procure environment
- [ ] Verify indexes and permissions

#### TypeScript Types & Utilities
- [x] `src/lib/supplierRelatedEntities.ts` — types, query functions
- [x] `src/lib/performanceRecords.ts` — types, submission/response/resolution workflows
- [ ] Export from main lib index

#### Content Updates
- [x] `CONTENT_UPDATES.md` — messaging guide
- [ ] Audit codebase for 2024 Act / B22-2026 references (mark as invalid/withdrawn)
- [ ] Update compliance help section
- [ ] Draft supplier onboarding text
- [ ] Draft buyer guidance for performance submission

#### Task #17 Phase 1 Complete
- [ ] Supplier-related entities table live
- [ ] Enterprise links table live
- [ ] Queries working end-to-end

#### Task #18 Phase 1 Complete
- [ ] Performance records table live
- [ ] Performance responses table live
- [ ] Performance resolution table live

---

### **Weeks 2–3: Supplier & Buyer UI (Oct 12–25)**

#### Task #17 Phase 2: Supplier Disclosure UI
**File:** `src/app/dashboard/profile/page.tsx` (add new section)

- [ ] New profile tab: "Linked Enterprises"
- [ ] Form: add director/beneficial owner/related entity
  - Entity name, registration number, relationship
  - Upload evidence (CIPC records, trust deed, etc.)
  - Mark as "self-disclosed"
- [ ] Display: list of disclosed entities, verification status
- [ ] Edit/remove capability
- [ ] Success messaging: "Transparency strengthens your SmartScore"

**Components:**
- `LinkEntitiesForm.tsx` — disclosure form
- `LinkEntitiesGallery.tsx` — display existing entities
- API calls via `supplierRelatedEntities.ts`

#### Task #18 Phase 2: Buyer Submission Form
**File:** New `src/app/dashboard/buyer/performance-concern/page.tsx`

- [ ] Form: submit performance concern
  - Supplier selector
  - Contract reference
  - Concern type dropdown (delivery_delay, quality_defect, etc.)
  - Severity (critical/major/minor)
  - Description & evidence upload
  - Date occurred
- [ ] Validation: require structured details (prevent vague claims)
- [ ] Submit → creates record, notifies supplier
- [ ] Confirmation: "Supplier will have 7 days to respond"

**Components:**
- `PerformanceConcernForm.tsx`
- API calls via `performanceRecords.ts`

#### Notifications
- [ ] Email: supplier notified of concern (with 7-day response window)
- [ ] Dashboard banner: supplier sees "Performance Concern - Action Required"

---

### **Weeks 3–5: Workflows & Admin Dashboard (Oct 19–Nov 1)**

#### Task #17 Phase 3: Admin Explorer
**File:** `src/app/dashboard/admin/enterprise-graph/page.tsx`

- [ ] Relationship explorer: search by director/entity, see all linked suppliers
- [ ] Verification workflow: review disclosures, approve/flag
  - Approve as "independently verified"
  - Flag for dispute
  - Request clarification
- [ ] Filter: verified vs. unverified, entity type, date
- [ ] Export: relationship map (CSV or visual graph)
- [ ] Audit trail: who verified what, when

**Components:**
- `EnterpriseExplorer.tsx` — search & visualization
- `VerificationWorkflow.tsx` — approve/flag UI
- Graph library: consider `react-force-graph` or `vis-js` for visualization

#### Task #18 Phases 3–4: Supplier Response & Admin Assessment
**File:** `src/app/dashboard/supplier/performance-concerns/page.tsx` + `src/app/dashboard/admin/performance-records/page.tsx`

**Supplier View:**
- [ ] Dashboard: list of open performance concerns
- [ ] Response form (7-day window):
  - Acknowledge / Dispute claim checkbox
  - Response text
  - Upload evidence (photos, correspondence, etc.)
  - Describe corrective actions taken/planned
  - Timeline for resolution
- [ ] Status tracking: submitted → under review → resolved/dismissed

**Admin Dashboard:**
- [ ] Performance record gallery per supplier
- [ ] Workflow: open → under review → resolved
- [ ] Fields visible:
  - Buyer's concern + evidence
  - Supplier's response + evidence
  - Admin assessment: risk level (low/medium/high/critical)
  - Resolution outcome dropdown
  - Final notes & appeal status
- [ ] Filters: status, concern type, severity, resolved/open
- [ ] Actions:
  - Mark resolved
  - Set delivery risk level
  - Accept/reject supplier explanation
  - Dismiss as unfounded
- [ ] Appeal workflow: mark under_appeal, review appeal decision

**Components:**
- `PerformanceConcernCard.tsx`
- `PerformanceResponseForm.tsx`
- `PerformanceAdminDashboard.tsx`
- `RiskAssessmentWidget.tsx`

---

### **Weeks 5–7: Integration & Polish (Nov 2–15)**

#### SmartScore Impact (Optional)
- [ ] Add "performance transparency" bonus to SmartScore
  - +5 points: supplier discloses all linked entities proactively
  - +3 points: supplier responds to concerns within 7 days
  - Negative adjustment: unresolved critical concerns (TBD logic)

#### Testing
- [ ] Unit tests for query functions (`supplierRelatedEntities.ts`, `performanceRecords.ts`)
- [ ] Integration tests: form submission → database → notifications
- [ ] E2E: supplier discloses entity → admin verifies → no performance impact
- [ ] E2E: buyer submits concern → supplier responds → admin resolves

#### Documentation
- [ ] API documentation (query signatures, error handling)
- [ ] Help center articles
  - "How to disclose linked enterprises"
  - "How to respond to a performance concern"
  - "What is delivery risk assessment?"
  - Bergstan judgment explainer: "Why context matters"
- [ ] Admin guide: performance record workflow

#### Deployment
- [ ] Run migrations on production
- [ ] Feature flags: enable for beta suppliers first
- [ ] Monitoring: audit trail, error logging

---

## Database Schema Summary

### Related Entities
```
supplier_related_entities (suppliers → directors, owners, related enterprises)
enterprise_links (supplier ↔ supplier via shared ownership/directorship)
supplier_entity_audit (changelog)
```

### Performance Records
```
supplier_performance_records (buyer concern → supplier)
performance_responses (supplier response)
performance_resolution (admin assessment & outcome)
performance_audit (changelog)
```

---

## Content Messaging

### Related Enterprises
**Theme:** "Transparency builds trust"
> "Disclose your directors and beneficial owners. Legitimate businesses often have related entities—transparency strengthens your credibility with buyers."

### Performance Records
**Theme:** "Poor performance is relevant—but not automatically disqualifying"
> "Past performance matters, but context does too. If a buyer flags an issue, you have the right to explain, provide evidence, and show corrective action. Procurement bodies assess the full picture."

---

## Compliance & Legal

### 2024 Public Procurement Act
- [x] Mark as "INVALID" (Constitutional Court judgment Sept 17, 2026)
- [x] Keep current B-BBEE/PPPFA/Treasury rules active
- [x] Prepare for replacement bill (TBD timeline)

### Bergstan v City of Cape Town (Sept 30, 2026)
- Related-enterprise graph + performance context = court-aligned design
- Suppliers have due process to respond & explain

### CIPC Beneficial Ownership
- Validates graph concept (but law-enforcement access restricted)
- AiForm enables voluntary supplier disclosure + verification

---

## Open Questions

1. **SmartScore weighting for performance:** How heavily should an unresolved critical concern penalize a supplier?
2. **Appeal authority:** Who reviews appeals? Admin only, or escalate to compliance officer?
3. **Data retention:** How long to keep performance records after resolution?
4. **Buyer verification:** Should buyers submit proof of contract (SLA, invoice, etc.)?
5. **Graph visualization:** Native React component or third-party library?

---

## Related Tasks

- **Task #17:** Build related-enterprise graph
- **Task #18:** Design contextual performance records
- **Task #19** (potential): Pipeline intelligence (separate feature for future programmes)

---

## Success Criteria

- [ ] Suppliers can disclose linked enterprises with evidence
- [ ] Admin can verify & link suppliers via common ownership
- [ ] Buyers can submit performance concerns with structured details
- [ ] Suppliers get 7-day response window with clear workflow
- [ ] Admin dashboard shows full context (concern + response + resolution)
- [ ] Appeals are tracked and resolved
- [ ] Content messaging emphasizes transparency & context
- [ ] Audit trail captures all actions
- [ ] Zero data loss or permission issues

---

**Next:** Run migrations and start Week 1 tasks.
