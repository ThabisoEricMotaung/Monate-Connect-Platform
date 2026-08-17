# AiForm Procure: Tender Source Expansion Scope
## 80K Opportunities in 8-12 Weeks

**Document Status:** Ready for Execution (Pending ToS Confirmation)  
**Prepared:** August 15, 2026  
**Owner:** Thabiso Motaung, Founder AiForm Procure

---

## Executive Summary

Current state: **15K opportunities** (eTenders only)  
Target state: **80K opportunities** (eTenders + ProTenders + TenderProSA)  
Platform growth: **5x**

**Timeline:** 8-12 weeks  
**Effort:** 160-240 hours (4-6 weeks per source, can run in parallel)  
**Budget:** $25K approved

---

## 1. LEGAL REVIEW: TERMS OF SERVICE

### ProTenders (protenders.co.za)

**Status:** ⚠️ **REQUIRES PERMISSION**

**Key findings:**
```
Section: Acceptable Use Policy
"You agree not to use our platform to:
- Scrape, crawl, or use automated systems to extract data without permission"
```

**However:**
```
Section: Government Tender Data
"Tender information displayed on our platform is aggregated from publicly available 
government sources. We do not claim ownership of this government data. The original 
tender information remains the property of the respective government departments and agencies."
```

**Interpretation:**
- Data is public (no copyright restrictions on government tenders)
- ProTenders aggregates it (proving it's possible)
- BUT: They prohibit scraping *their* site without permission
- **ACTION REQUIRED:** Contact ProTenders for:
  1. Official scraping permission, OR
  2. API access to their aggregated data

**Contact:** tendersportlight@gmail.com

---

### TenderProSA (tenderprosa.co.za)

**Status:** 🔍 **TERMS NOT YET REVIEWED**

**Next step:** Fetch full Terms of Service from tenderprosa.co.za/terms-of-service

**Known facts:**
- Aggregates 600+ sources including eTenders, municipalities, SOEs
- Uses Google Analytics and Microsoft Clarity (no data reselling stated)
- Offers free trial with no credit card required
- Email: info@tenderprosa.co.za for inquiries

---

## 2. RECOMMENDED APPROACH

### Option A: Ask for Permission (Safest) ✅ **RECOMMENDED**

**Week 1 Actions:**
1. Email ProTenders at tendersportlight@gmail.com:
   ```
   Subject: Data Partnership Inquiry - ProTenders API Access
   
   Hi ProTenders Team,
   
   AiForm Procure is a South African procurement platform helping suppliers 
   understand compliance requirements and find opportunities.
   
   We currently use the National Treasury OCDS API to surface eTenders data 
   to our users. We're interested in expanding to include municipal and 
   provincial tenders to provide suppliers with a more complete opportunity set.
   
   Would ProTenders consider:
   1. Granting permission to aggregate your published data via web scraping?
   2. Offering an API partnership for data access?
   3. A referral/affiliate arrangement?
   
   We'd be happy to credit ProTenders as a data source and link to your platform.
   
   Best regards,
   Thabiso Motaung
   Founder, AiForm Procure
   ```

2. Similar inquiry to TenderProSA at info@tenderprosa.co.za

3. **Expected response time:** 5-10 business days

**Advantages:**
- Zero legal risk
- Builds partnership (future opportunities)
- Establishes professional credibility
- Clean relationship with data sources

**Disadvantages:**
- Slower (5-10 day wait)
- Might decline or demand fees

---

### Option B: Build Scrapers with Legal Caution (Faster but Riskier)

If ProTenders/TenderProSA decline or don't respond in 2 weeks:

**Legal basis:**
- Government tender data is public (MFMA requirement for municipalities)
- Not copyrighted (public information)
- South Africa permits scraping of public data (depends on ToS)
- **Risk:** ProTenders has explicit scraping prohibition in ToS

**Approach:**
1. Focus on official government sources first:
   - National Treasury OCDS (already using) ✅
   - Municipal tender portals (federated, not aggregated)
   - SOE procurement (Eskom, Transnet, SANRAL publish publicly)

2. Avoid ProTenders/TenderProSA scraping if they prohibit it

---

## 3. TECHNICAL ARCHITECTURE

### Current: Single-Source Sync

```
eTenders OCDS API
    ↓
Watermark (last_synced_at)
    ↓
Fetch releases (paginated)
    ↓
Transform to RfqUpsertPayload
    ↓
Upsert to rfqs table
    ↓
Terminal notice classification
    ↓
Email alerts
```

### Expanded: Multi-Source Sync

```
┌─────────────────────────────────────────┐
│ Tender Source Orchestrator              │
└─────────────────────────────────────────┘
         │
    ┌────┴────┬────────┬────────┐
    ↓         ↓        ↓        ↓
eTenders  ProTenders TenderProSA SOEs
(OCDS API) (Scraper) (Scraper) (APIs)
    │         │        │        │
    └────┬────┴────┬───┴────┬───┘
         ↓         ↓        ↓
      Transform Pipeline (unified)
         │
    Deduplication Engine
    (detect same tender across sources)
         │
    Normalization & Enrichment
         │
    Terminal Notice Classification
         │
    Upsert to rfqs table
    (with source attribution)
         │
    Alert & Notification Engine
```

---

## 4. DATABASE SCHEMA CHANGES

### Current rfqs Table Structure
```sql
external_ocid          -- Unique ID per source
external_reference     -- Source-specific reference
source_name            -- Already exists ("eTenders")
original_source_url    -- Already exists (eTenders URL)
title, description, category, etc.
```

### Required Additions

```sql
-- Track which source(s) have this opportunity
ALTER TABLE rfqs ADD COLUMN source_names TEXT[] DEFAULT '{}';
-- Example: ARRAY['eTenders', 'ProTenders']

-- Deduplication: map multiple external_ocids to canonical record
CREATE TABLE tender_dedups (
  id BIGSERIAL PRIMARY KEY,
  canonical_rfq_id BIGINT REFERENCES rfqs(id),
  external_ocid TEXT,
  source_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(external_ocid, source_name)
);
-- Why: Same tender published on eTenders + ProTenders 
-- should appear once, but track both sources

-- Sync state per source (instead of single watermark)
ALTER TABLE etenders_sync_state RENAME TO tender_sync_state;
ALTER TABLE tender_sync_state ADD COLUMN source_name TEXT;
-- Example rows:
-- (id=1, source_name='eTenders', last_synced_at=...)
-- (id=2, source_name='ProTenders', last_synced_at=...)
-- (id=3, source_name='TenderProSA', last_synced_at=...)
```

---

## 5. IMPLEMENTATION PLAN

### Phase 1: Preparation (Week 1)
- [ ] Read ProTenders full ToS
- [ ] Read TenderProSA full ToS
- [ ] Email ProTenders requesting permission/API
- [ ] Email TenderProSA requesting permission/API
- [ ] Create database schema migrations
- [ ] Set up staging environment for testing

**Effort:** 20 hours  
**Risk:** None (research only)

---

### Phase 2: ProTenders Integration (Weeks 2-5)

#### If Permission/API Granted:
1. **Build ProTenders connector** (60-80 hours)
   - Web scraper using Cheerio + Playwright (avoid rate limiting)
   - Pagination handling
   - Date-based watermark
   - Data extraction: title, buyer, closing date, value, etc.

2. **Build transformer** (20 hours)
   - Convert ProTenders HTML to RfqUpsertPayload
   - Handle missing fields gracefully
   - Map ProTenders categories to AiForm categories

3. **Integrate deduplication** (20 hours)
   - Detect when same tender exists in eTenders + ProTenders
   - Create dedup record
   - Merge source_names on canonical RFQ

4. **Test on staging** (20 hours)
   - Load 1K sample tenders
   - Verify no duplicates
   - Check alert triggering
   - Monitor performance

**Total Effort:** 120-140 hours (3-4 weeks, 30-35 hrs/week)

---

### Phase 3: TenderProSA Integration (Weeks 6-9)

Same as Phase 2 but for TenderProSA data sources (parallel if resources allow)

**Total Effort:** 120-140 hours (3-4 weeks)

---

### Phase 4: Load Testing & Go-Live (Weeks 10-12)

1. **Load test** (20 hours)
   - Simulate 80K tenders in database
   - Measure alert performance
   - Check search latency

2. **Production deployment** (10 hours)
   - Run migrations
   - Backfill source_name='eTenders' on existing 15K
   - Enable ProTenders sync cron
   - Enable TenderProSA sync cron
   - Monitor first 48 hours

3. **Documentation** (10 hours)
   - Update sync docs
   - Update API docs (if exposing source filtering)
   - Write runbook for source-specific issues

**Total Effort:** 40 hours (1 week)

---

## 6. EFFORT & TIMELINE

| Phase | Task | Weeks | Hours | Notes |
|-------|------|-------|-------|-------|
| 1 | ToS review + setup | 1 | 20 | Blocking for phases 2-3 |
| 2a | ProTenders scraper | 4 | 130 | Can start week 2 if permission granted |
| 2b | ProTenders integration | 4 | 20 | Dedup + transformer |
| 3a | TenderProSA scraper | 4 | 130 | Can run parallel with phase 2 |
| 3b | TenderProSA integration | 4 | 20 | Dedup + transformer |
| 4 | Testing + go-live | 2 | 40 | Load test + production deployment |
| **TOTAL** | | **8-12** | **360** | Can compress to 8 weeks with 2 parallel devs |

**Budget:** $25K covers ~250-300 billable hours at $80-100/hr  
**Feasibility:** Solid, assuming permission granted by week 2

---

## 7. RISK ASSESSMENT

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Permission denied | Medium (30%) | High | Have backup: build SOE scrapers (Eskom, Transnet) instead |
| Scraper breaks (site updates) | Medium (40%) | Medium | Monthly maintenance; use CSS selectors not patterns |
| Dedup logic errors | Low (10%) | High | Comprehensive unit tests + manual spot-checks |
| Rate limiting | Medium (30%) | Low | Exponential backoff; stagger requests by source |
| Data quality (bad data from source) | High (60%) | Low | Validation layer; quarantine malformed records |
| Performance (80K tenders slow down search) | Low (15%) | Medium | Database indexing on source_name + category |

---

## 8. ALTERNATIVE: Build from Official Sources Only

If both ProTenders and TenderProSA decline:

**Plan B: Federated Municipal Scraping**
- Target 257 South African municipalities individually
- Each publishes tenders (MFMA requirement)
- No aggregator, so no ToS violation
- Effort: 8-10 weeks (more complex due to fragmentation)
- Result: ~40-50K municipal tenders (less than ProTenders/TenderProSA, but legal)

---

## 9. NEXT STEPS

### This Week (Aug 15-22)

1. ✅ **Email ProTenders**
   - tendersportlight@gmail.com
   - Request: scraping permission or API access
   - CC yourself for follow-up

2. ✅ **Email TenderProSA**
   - info@tenderprosa.co.za
   - Request: data partnership

3. ✅ **Review full TenderProSA ToS**
   - Visit tenderprosa.co.za/terms-of-service
   - Document findings

4. ✅ **Database schema prep**
   - Draft migrations for dedup table
   - Test on local staging environment

5. ✅ **Set decision gate**
   - Aug 22 decision: Do we have permission?
   - If yes → start scrapers week 2
   - If no → pivot to Plan B (municipal scraping)

### Week 2+ (Pending Permission)

- Build ProTenders connector
- Build TenderProSA connector
- Parallel integration & testing

---

## 10. SUCCESS METRICS

**Go-Live Targets:**

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Total opportunities | 15K | 80K | Week 12 |
| Data freshness | ~24 hrs (eTenders) | 12-24 hrs all sources | Week 10 |
| Search latency (p95) | <500ms | <800ms | Week 10 |
| Alert volume | ~200/day | ~1,000/day | Week 12 |
| Duplicate rate | 0% | <2% | Week 9 |
| Source attribution accuracy | 100% | 99%+ | Week 9 |

---

## Questions for Decision

1. **Permission strategy:** Do you want to email both platforms before building?
   - *Recommended: Yes (safest, builds partnerships)*

2. **Parallel development:** Can you allocate 2 developers for weeks 2-9?
   - *Without parallelization, timeline stretches to 12 weeks*

3. **Contingency:** If both decline, do you want to pursue municipal scraping instead?
   - *Recommend: Yes, keep 80K target alive*

4. **Budget:** Is the $25K approved for external dev help, or internal?
   - *Affects velocity and calendar time*

---

## Approval & Sign-Off

**Prepared by:** Claude  
**Reviewed by:** [Pending]  
**Approved by:** [Pending]  
**Start Date:** Aug 18, 2026 (pending ToS confirmations)

---

**Next action:** Email both platforms. Report back by Aug 22.

Sources:
- [ProTenders Terms of Service](https://www.protenders.co.za/terms-of-service)
- [TenderProSA](https://tenderprosa.co.za/)
