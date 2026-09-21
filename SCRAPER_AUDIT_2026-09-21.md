# AiForm Procure Scraper & Data Quality Audit
**Date:** 2026-09-21  
**Status:** CRITICAL ISSUES IDENTIFIED

---

## Executive Summary
The collector infrastructure is partially healthy but publishing incomplete data. Three test opportunities are live in production. City of Cape Town data lacks critical normalization fields. Data quality must be fixed before announcing source expansion.

---

## Current Collector Status

### Active Collectors (Daily at 6 AM SAST)
| Collector | Status | Records | Issues |
|-----------|--------|---------|--------|
| eTenders | ✅ Active | ~309 | Complete normalization |
| City of Cape Town | ⚠️ Partial | 44 | Missing province, category, industry |
| City of Johannesburg | ✅ Active | ? | TBD |
| Ekurhuleni | ✅ Active | ? | TBD |
| Department of Health | ✅ Active | ? | TBD |

### Disabled Collectors (TODO)
- Eskom
- DBSA
- TCTA
- SANRAL

---

## Critical Issues

### 1. Test Data in Production (URGENT)
**Status:** 🚨 LIVE NOW  
**Impact:** Undermines trust; appears in public API

**Affected Records:**
- "New Tender - IT Services" (Gauteng)
- "New RFQ - Office Supplies" (Western Cape)
- "New Opportunity - Construction" (KwaZulu-Natal)
- "Under Evaluation - HR Consulting" (Gauteng)
- "Under Evaluation - Training Services" (Western Cape)
- "Under Evaluation - Security Services" (Eastern Cape)

**Root Cause:** Added via `seed_data_update.sql` for metric testing  
**Action:** Execute `quarantine_test_opportunities.sql` immediately to set `is_public = false`

---

### 2. City of Cape Town Data Quality
**Status:** ⚠️ Incomplete Normalization  
**Records Affected:** 44 out of 356 live opportunities (12%)

**Missing Fields:**
- `province` - NULL for all City CT records
- `category` - NULL  
- `industry` - NULL  
- `buyer_name` / `buyer_org` - Hardcoded to "City of Cape Town Metropolitan Municipality" (should be parsed per tender)

**Root Cause:** `CapeownCollector.ts` scrapes title/description only; doesn't extract or normalize:
- Geographic region from tender details
- Category from tender class/type field
- Department/unit that owns the tender

**Impact:** Regional Insights map cannot display City CT tenders; filtering/search broken

**Action Required:**
1. Audit City CT website HTML structure to identify province/category fields
2. Extend `CapeownCollector.scrapeListings()` to extract these fields
3. Normalize province names to match `RegionalInsightsMap` valid provinces
4. Re-run collector to update existing 44 records

---

### 3. Normalization Gap in TenderCollectorBase
**Status:** ⚠️ Architecture Issue  
**Affected:** All non-eTenders sources

**Problem:** Base class `normalizeTender()` only handles:
- `external_ocid`, `title`, `description`
- `closing_date`, `published_date`
- `buyer_normalized`, `source_name`
- `is_external_opportunity`, `is_public`, `status`, `estimated_budget`

**Missing from Normalization:**
- `province` (critical for Regional Insights)
- `category` (critical for filtering)
- `industry` (helpful for discovery)
- `estimated_value_min` / `estimated_value_max`

**Action:** Extend `NormalizedTender` interface and base class to handle these fields

---

## Collector Health Metrics

### Current Monitoring
The `/api/cron/collect-tenders` endpoint returns per-collector stats:
```json
{
  "ok": true,
  "collectors": {
    "Cape Town": {
      "success": true,
      "inserted": N,
      "updated": N,
      "skipped": N
    }
  }
}
```

### Missing Metrics (Status Report Requirement #3)
Need to add tracking for:
- **imported** - records successfully added/updated
- **rejected** - records that failed validation
- **incomplete** - records with NULL critical fields (province, category, etc.)
- **duplicated** - records flagged as duplicates (via `external_ocid`)
- **stale** - records with `closing_date` in past but not yet marked closed
- **last_successful_run** - timestamp of last successful collection

**Implementation:** Add `CollectorMetrics` table + store in each collector.collect() response

---

## Action Plan for Today

### Phase 1: Immediate (Today)
- [ ] Execute `quarantine_test_opportunities.sql` in Supabase
- [ ] Verify test data removed from `/api/tenders` API
- [ ] Commit quarantine script to repo
- [ ] Refresh homepage to confirm Under Evaluation metric recalculates correctly

### Phase 2: Data Quality Fix (This Week)
- [ ] Audit City of Cape Town website for province/category field locations
- [ ] Update `CapeownCollector` to extract province/category from HTML
- [ ] Add province normalization mapping (handle local names, aliases)
- [ ] Re-run City CT collector on all 44 existing records
- [ ] Validate: all City CT records should have province + category populated

### Phase 3: Monitoring & Health (Next Week)
- [ ] Create `CollectorMetrics` schema
- [ ] Add `imported`, `rejected`, `incomplete`, `duplicated`, `stale` tracking
- [ ] Create collector health dashboard
- [ ] Set up alerts for:
  - Collector failures (no records in 24h)
  - High rejection rate (>5%)
  - High incomplete rate (>2%)

### Phase 4: Announcement
Only after Phase 1-2 complete:
- Create blog post: "City of Cape Town now included in AiForm Procure"
- Highlight: 44 new municipal tenders accessible
- Link to updated Regional Insights map

---

## Files to Review/Modify

**Critical:**
- `quarantine_test_opportunities.sql` ← EXECUTE TODAY
- `src/lib/collectors/CapeownCollector.ts` ← Review + update
- `src/lib/collectors/TenderCollectorBase.ts` ← Extend NormalizedTender interface

**Supporting:**
- `src/app/api/cron/collect-tenders/route.ts` ← Add metrics logging
- `src/lib/publicOpportunities.ts` ← Verify City CT records fetch correctly

---

## Verification Checklist

After each phase, verify:
```sql
-- Check test data is hidden
SELECT COUNT(*) FROM public.rfqs WHERE is_public = false AND title LIKE '%New%';
-- Should return 6

-- Check City CT data quality
SELECT province, category, COUNT(*) FROM public.rfqs 
WHERE source_name = 'City of Cape Town' 
GROUP BY province, category;
-- Should show provinces + categories, NOT NULL

-- Check live opportunities still healthy
SELECT COUNT(*) FROM public.rfqs WHERE is_public = true AND status = 'active';
-- Should return ~350 (original + City CT, minus test data)
```

---

## Notes
- eTenders collector appears healthy (309 records with complete normalization)
- Test data was added for metric validation—good intention, wrong environment
- City of Cape Town is genuine milestone but needs data quality before promotion
- Supplier acquisition still lagging behind verification capability

