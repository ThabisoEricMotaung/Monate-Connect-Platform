# Stats Alignment Refactor: Unified Query for Homepage & Tenders

## Problem
AiForm Procure had a recurring stats mismatch:
- **Homepage** displayed 626 "live opportunities"
- **Tenders page** displayed 788 total opportunities
- Same database, different numbers - user-facing confusion

## Root Causes
1. **Curation Filtering Mismatch**
   - Homepage: `.or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")`
   - Tenders: No curation filtering
   - Result: Homepage excluded ~162 non-approved external opportunities

2. **Inconsistent Date Logic**
   - Homepage: `gt("closing_date", nowIso)` - strictly after current moment
   - Tenders: `gte('closing_date', today)` through `lte('closing_date', targetDate)` - within date range
   - Timezone handling differed between endpoints

3. **Duplicate Query Logic**
   - Each endpoint had separate query builders
   - No single source of truth for "what counts as live"
   - Easy to diverge over time

## Solution: Unified Query Module

### New File: `src/lib/opportunityStatsQuery.ts`
Centralized query builder ensuring consistency:

```typescript
// Unified base filters used by both endpoints
buildBaseOpportunityQuery(supabase, { now, countOnly })
  .eq('is_public', true)
  .eq('status', 'active')
  .gt('closing_date', nowIso)
  // NO curation_status filtering (tenders is source of truth)
```

**Key Design Decisions:**
1. **Source of Truth: Tenders Page**
   - Tenders page doesn't filter by curation_status
   - Homepage now aligns with tenders filtering
   - Result: More opportunities shown on homepage (includes non-approved external)

2. **Consistent Timezone Handling**
   - `getSastAdjustedToday()` - Both endpoints now use SAST-adjusted "today"
   - Eliminates date comparison ambiguities

3. **Centralized Definitions**
   - `getSouthAfricaClosingWeekEnd()` - Moved to shared module
   - `buildDateRangeOpportunityQuery()` - For tenders date range filtering

### Updated Files

#### 1. `src/lib/publicOpportunityStats.ts`
**Before:**
```typescript
const eligibleBase = () =>
  supabase
    .from("rfqs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active")
    .gt("closing_date", nowIso)
    .eq("is_public", true)
    .or("is_external_opportunity.is.null,is_external_opportunity.eq.false,curation_status.eq.approved")
    // ↑ This filtering was causing the mismatch
```

**After:**
```typescript
const eligibleBase = () => buildBaseOpportunityQuery(supabase, { now, countOnly: true })
// ✓ Uses unified query, no curation filtering
```

#### 2. `src/app/api/tenders/route.ts`
**Before:**
```typescript
// Date handling not using unified SAST logic
const nowMs = Date.now();
const offsetMs = (2 * 60 * 60 * 1000);
const sastNow = new Date(nowMs + offsetMs);
const today = new Date(sastNow);
today.setUTCHours(0, 0, 0, 0);

// Separate filter application in three places (baseQuery, countQuery, newCountQuery)
baseQuery = baseQuery
  .eq('is_public', true)
  .eq('status', 'active')
  .not('closing_date', 'is', null)
  .not('title', 'ilike', '%SMOKE TEST%')
  .not('title', 'ilike', '%[TEST]%');
  // ... repeated in countQuery and newCountQuery
```

**After:**
```typescript
// Use unified SAST handling
const today = getSastAdjustedToday();

// Use centralized filter function
function applyBaseOpportunityFilters(query) {
  return query
    .eq('is_public', true)
    .eq('status', 'active')
    .not('closing_date', 'is', null)
    .not('title', 'ilike', '%SMOKE TEST%')
    .not('title', 'ilike', '%[TEST]%');
}

// Apply consistently to all three queries
baseQuery = applyBaseOpportunityFilters(baseQuery).gte(...).lte(...);
countQuery = applyBaseOpportunityFilters(countQuery).gte(...).lte(...);
newCountQuery = applyBaseOpportunityFilters(newCountQuery).gte(...).lte(...);
```

## Verification

### Expected Behavior After Refactor
1. **Homepage liveOpportunities count increases** - Now includes non-approved external opportunities
2. **Tenders total count may decrease slightly** - Now uses consistent filtering
3. **Both counts should be closer/aligned** when fetched simultaneously

### Verification Script
Run `verify-stats-alignment.ts` to test:
```bash
npx ts-node verify-stats-alignment.ts
```

This compares:
- Homepage query: All future opportunities (no curation filter)
- Tenders query: Future opportunities within 90-day window (no curation filter)

## Files Modified
1. `/src/lib/opportunityStatsQuery.ts` - NEW
2. `/src/lib/publicOpportunityStats.ts` - Updated imports, removed inline curation filtering
3. `/src/app/api/tenders/route.ts` - Updated to use unified query helpers, centralized filter application

## Impact on Users
- **Homepage stats**: Will show more opportunities (previously filtered out non-approved external)
- **Tenders page**: More consistent with homepage filtering
- **Admin dashboard**: Any other stats pages using these queries will now be aligned

## Future-Proofing
- Single source of truth for "opportunity filters" in `opportunityStatsQuery.ts`
- Changes to filtering rules can be made in one place
- Easy to add new stat endpoints that inherit correct behavior
- Clear documentation of which filters apply to "public opportunities"

## Notes
- Curation status filtering still available in publicOpportunityStats for "screenedPercent" calculation (external-only metric)
- Date range queries for tenders still support custom daysUntilClose parameter
- SAST timezone handling ensures consistent date boundaries across day-based filtering
