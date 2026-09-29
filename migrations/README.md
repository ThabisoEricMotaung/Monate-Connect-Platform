# Database Migrations

## cleanup_tender_html_entities.sql

**Purpose:** Decode HTML entities in tender data and improve buyer organization extraction.

**Date Created:** 2026-09-29

**What it does:**
1. Creates a `decode_html_entities()` function to replace common HTML entities (`&nbsp;`, `&amp;`, `&lt;`, `&gt;`, `&quot;`)
2. Normalizes whitespace in all tender titles and descriptions (multiple spaces → single space)
3. Maps organization names based on tender reference patterns and source
4. Extracts and sets correct buyer names for tenders marked as "Unknown"

**Affected organizations:**
- SANRAL (South African National Roads Agency Limited)
- Eskom (Eskom Holdings SOC Limited)
- City of Cape Town
- City of Johannesburg
- Ekurhuleni Metropolitan Municipality
- Department of Health
- DBSA (Development Bank of Southern Africa)
- TCTA (Trans-Caledon Tunnel Authority)

**How to apply:**

### Option A: Via Supabase Dashboard
1. Open Supabase dashboard for the project
2. Go to SQL Editor
3. Create a new query
4. Copy the entire contents of `cleanup_tender_html_entities.sql`
5. Execute the query
6. Review the verification output to confirm cleanup

### Option B: Via psql CLI
```bash
psql postgresql://[user]:[password]@[host]:5432/[database] < cleanup_tender_html_entities.sql
```

**Verification:**
The script ends with a query that shows:
- Total tenders per source
- Count of remaining tenders with "Unknown" buyer
- Count of titles still containing HTML entities

After cleanup, both should show 0 (or very close to it).

**Rollback:**
If needed, you can restore from database backups. The changes are destructive, so ensure you have backups before running.

---

## New HTML Utilities (src/lib/htmlUtils.ts)

**Purpose:** Centralized HTML entity decoding and text cleaning for all collectors.

**Key functions:**
- `decodeHtmlEntities(text)` - Replaces HTML entities with their character equivalents
- `cleanText(text)` - Decodes entities + normalizes whitespace + trims
- `extractOrganizationFromTitle(title, sourceName)` - Intelligently extracts buyer organization name
- `cleanTitle(title, maxLength)` - Cleans and limits title length

**Updated collectors:**
All collectors should import and use these utilities:
```typescript
import { cleanText, cleanTitle, extractOrganizationFromTitle } from "@/lib/htmlUtils"

// In normalizeTender method:
const cleanedTitle = cleanTitle(raw.title)
const buyerNormalized = extractOrganizationFromTitle(raw.title, this.sourceName)
```

The `TenderCollectorBase` already applies these automatically in the `normalizeTender()` method.
