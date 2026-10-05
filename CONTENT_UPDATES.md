# Content Updates Required
## Weeks 1-2: Prepare messaging for enterprise graph & performance records

### 1. Remove/Correct Reform Content
**Action:** Search all pages, docs, blog for references to:
- "Public Procurement Act 2024" — mark as INVALID (Constitutional Court judgment Sept 17)
- "B22-2026 amendment bill" — mark as WITHDRAWN
- Any references to "upcoming 2024 Act commencement" → update to "current framework under PFMA/MFMA/PPPFA"

**Files to audit:**
- `src/components/ComplianceInfo.tsx` or similar
- Help center / FAQ
- Blog posts about "2024 Act changes"
- Onboarding flows (compliance section)
- Email templates

**Sample correction:**
```
OLD: "The Public Procurement Act 2024 will introduce new set-asides..."
NEW: "The framework remains governed by PFMA, MFMA, PPPFA and Treasury Instructions. (Note: The 2024 Act was declared unconstitutional by the Constitutional Court in September 2026.)"
```

---

### 2. Enterprise Disclosure Messaging
**Add to:** Supplier onboarding, profile completion, compliance section

**Messaging theme:** "Transparency builds trust"

```
### Linked Enterprises & Beneficial Owners

We recognize that many legitimate businesses have common ownership, shared directors, or related entities. Disclosing these relationships builds trust and helps procurement bodies make informed decisions.

**You can disclose:**
- Directors and their other company directorships
- Beneficial owners (shareholders)
- Related companies or subsidiaries
- Common ownership arrangements

**Why it matters:**
- Prevents conflicts of interest
- Demonstrates organizational transparency
- Supports compliance with beneficial-ownership regulations
- Allows procurement bodies to assess relationships holistically, not just reject over conflicts

**How it works:**
1. Go to your profile → "Linked Enterprises"
2. Add director names, beneficial owners, related companies
3. Upload supporting evidence (CIPC records, trust deeds, etc.)
4. We'll verify and mark as "independently verified"

You're not penalized for disclosure—in fact, transparency strengthens your SmartScore.
```

---

### 3. Performance Transparency Messaging
**Add to:** Supplier dashboard, profile, help center

**Messaging theme:** "Poor performance is relevant—but not automatically disqualifying"

```
### Your Performance Record

If a buyer has raised a performance concern about a past contract, you'll see it here.

**What this means:**
- Past performance is relevant to procurement decisions
- Concerns are documented with evidence and dates
- **You have the right to respond** — explain what happened, dispute if warranted, show corrective actions
- Procurement bodies assess context, not just history

**How the process works:**
1. **Buyer submits concern** — with specific evidence and details
2. **You respond** — within 7 days, you can explain, provide evidence, or describe corrective action
3. **Admin reviews** — assesses both the concern and your response
4. **Final assessment** — risk level determined; you can appeal

**Important:** A performance concern does NOT automatically disqualify you. Procurement bodies must consider:
- The nature of the concern (delivery delay ≠ safety breach)
- Your response and explanation
- Corrective actions you've taken
- Context and circumstances

**Example:**
> "Delivery delayed 2 weeks due to supplier material shortage — we expedited from backup supplier, delivered within 3 weeks of contract date, no penalty clauses invoked. Implemented new supplier redundancy protocol."

This context matters. A delay with a clear explanation and corrective action is very different from repeated unexplained delays.
```

---

### 4. Compliance Engine (No messaging change, but validate)
**Action:** Confirm in help/docs that these remain relevant:
- B-BBEE scoring and level verification
- Preference-point calculations
- SBD 4 compliance (updated version coming with revised bill)
- Treasury procurement rules and thresholds
- CSD registration and status verification

**Sample messaging:**
```
## Current Compliance Framework

AiForm Procure validates suppliers against:
- **B-BBEE Act and Codes** — ownership, management, employment equity
- **CSD Registration** — Central Supplier Database status
- **Tax Compliance** — SARS TCS status and tax reference verification
- **CIPC Registration** — company status and beneficial ownership
- **Treasury Procurement Rules** — preference points, set-asides, thresholds

This framework remains in effect while Parliament develops replacement legislation.
```

---

### 5. Pipeline Intelligence (Messaging only, feature comes later)
**Add a teaser/info banner:**

```
### Coming Soon: Procurement Pipeline Intelligence

We're adding visibility into major government programmes and pre-qualified procurements—so you can plan capacity and skills ahead of live tender releases.

This separate from active opportunities, helping you anticipate demand in your sector.
```

---

## Implementation Checklist

- [ ] Search repo for "2024 Act" and "B22-2026" references
- [ ] Audit compliance/help sections
- [ ] Update onboarding flow for linked-entity disclosure
- [ ] Draft supplier-facing help articles (enterprise disclosure, performance transparency)
- [ ] Draft buyer/admin guidance (how to submit performance concerns)
- [ ] Add "Poor performance is relevant—but not automatically disqualifying" as platform theme
- [ ] Update footer/disclaimer if needed
- [ ] QA all content links in email templates and notifications

---

## Next: Week 1 Implementation
1. Run migrations (related entities + performance records)
2. Build Supplier UI: "Linked Enterprises" section in profile
3. Build Buyer Form: performance concern submission
4. Publish content updates to help center
