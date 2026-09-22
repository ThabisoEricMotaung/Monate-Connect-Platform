# EskomCollector - Technical Implementation Specification

## Quick Reference

**Portal**: Eskom Tender Bulletin  
**URL**: https://tenderbulletin.eskom.co.za/  
**Status**: Public, fully accessible, no auth required for viewing  
**Active Tenders**: ~340  
**Pagination**: 68 pages, 5 tenders per page (default)  

---

## 1. Class Structure (Following Pattern)

```typescript
/**
 * Eskom Tender Collector
 * Scrapes public tender listings from https://tenderbulletin.eskom.co.za
 */

import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"

export class EskomCollector extends TenderCollectorBase {
  constructor() {
    super("Eskom", "https://tenderbulletin.eskom.co.za")
  }

  async scrapeListings(): Promise<RawTender[]> {
    const tenders: RawTender[] = []
    const baseUrl = "https://tenderbulletin.eskom.co.za"
    
    // Pagination: pages 1-68 (may increase over time)
    const MAX_PAGES = 68 // Update dynamically if possible
    const PAGE_SIZE = 10 // Can request up to 25+ per page
    
    for (let pageNumber = 1; pageNumber <= MAX_PAGES; pageNumber++) {
      try {
        const pageUrl = `${baseUrl}/?pageNumber=${pageNumber}&pageSize=${PAGE_SIZE}`
        
        // Fetch and parse logic here
        // ... (see implementation sections below)
      } catch (pageError) {
        console.warn(`[Eskom] Page ${pageNumber} failed:`, pageError)
        continue
      }
    }
    
    return tenders
  }
}
```

---

## 2. Scraping Strategy

### Option A: Puppeteer/Playwright (Recommended)
**Rationale**: Page is React SPA, content rendered client-side

```typescript
async scrapeListings(): Promise<RawTender[]> {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()
  const tenders: RawTender[] = []
  
  for (let pageNum = 1; pageNum <= 68; pageNum++) {
    const url = `https://tenderbulletin.eskom.co.za/?pageNumber=${pageNum}&pageSize=10`
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Extract articles from DOM
    const articles = await page.$$eval('article', elements =>
      elements.map(el => ({
        reference: el.querySelector('heading')?.innerText || '',
        description: el.querySelector('[class*="description"]')?.innerText || '',
        division: Array.from(el.querySelectorAll('div, span')).find(e =>
          e.innerText?.includes('DISTRIBUTION') || e.innerText?.includes('GENERATION')
        )?.innerText || '',
        closingDate: Array.from(el.querySelectorAll('div, span')).find(e =>
          e.innerText?.match(/\d{4}-\w+-\d{1,2}/)
        )?.innerText || '',
        publishedDate: // similar extraction
        location: // similar extraction
        tenderId: el.querySelector('a[href*="/tender/"]')?.href?.match(/\/tender\/(\d+)/)?.[1]
      }))
    )
    
    tenders.push(...articles)
    
    // Rate limiting
    await page.waitForTimeout(500)
  }
  
  await browser.close()
  return tenders
}
```

### Option B: Native HTTP + Cheerio (If API becomes available)
```typescript
const response = await fetch(url, {
  headers: { 
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }
})
const html = await response.text()
const $ = cheerio.load(html)

$('article').each((i, article) => {
  // Extract using cheerio selectors
})
```

**Status**: Not currently viable without API, but keep as fallback option

---

## 3. Field Extraction Logic

### Reference Number
```typescript
// From article > heading
const reference = article.querySelector('heading')?.innerText?.trim() || ''
// Examples: "ERI/2022/BMS/08", "MWP2457DX"
```

### Title/Description
```typescript
// Multiple description elements - combine carefully
const descriptions = Array.from(article.querySelectorAll('generic, div, span'))
  .filter(el => !el.innerText.includes('Location') && 
                !el.innerText.includes('Date') &&
                el.innerText.length > 10)
  .map(el => el.innerText.trim())

const title = descriptions[0] || ''
```

### Division/Department
```typescript
const divisionEl = Array.from(article.querySelectorAll('generic, div, span')).find(el =>
  /DISTRIBUTION|GENERATION|ESKOM|ENTERPRISES|TRANSMISSION/i.test(el.innerText)
)
const division = divisionEl?.innerText?.trim() || 'Unknown'
```

### Dates
```typescript
// Format: "2027-Feb-22 13:33:00"
const datePattern = /(\d{4})-(\w+)-(\d{1,2})\s+(\d{1,2}):(\d{2}):(\d{2})/

const closingDateStr = Array.from(article.querySelectorAll('generic, div, span'))
  .find(el => el.innerText?.includes('Closing'))?.innerText
  
const closingMatch = closingDateStr?.match(datePattern)
const closingDate = closingMatch ? 
  new Date(`${closingMatch[1]}-${closingMatch[2]}-${closingMatch[3]} ${closingMatch[4]}:${closingMatch[5]}`) :
  null
```

### Tender ID (for downloads)
```typescript
const tenderLink = article.querySelector('a[href*="/tender/"]')
const tenderId = tenderLink?.href?.match(/\/tender\/(\d+)/)?.[1]
// Example: /tender/73478 => tenderId = "73478"
```

### Location
```typescript
const locationTexts = Array.from(article.querySelectorAll('generic, div, span'))
  .filter(el => el.innerText?.includes('Eskom') || el.innerText?.includes('Location'))
  .map(el => el.innerText.trim())
  
const location = locationTexts.join(' ').substring(0, 200) || 'South Africa'
```

---

## 4. Data Normalization

```typescript
protected normalizeTender(raw: RawTender): NormalizedTender {
  const now = new Date()
  const closingDate = raw.closing_date ? new Date(raw.closing_date) : null
  const status = closingDate && closingDate < now ? "closed" : "active"

  // Infer category from division/description
  let category = "Professional Services"
  if (raw.description?.toLowerCase().includes('supply')) category = "Goods"
  if (raw.description?.toLowerCase().includes('construction')) category = "Construction"
  if (raw.description?.toLowerCase().includes('services')) category = "Services"
  if (raw.description?.toLowerCase().includes('maintenance')) category = "Maintenance"

  return {
    external_ocid: raw.reference_number, // e.g., "ERI/2022/BMS/08"
    title: raw.title.substring(0, 200),
    description: raw.description?.substring(0, 2000) || null,
    closing_date: closingDate?.toISOString() || null,
    published_date: raw.published_date?.toISOString() || null,
    original_source_url: raw.source_url,
    buyer_normalized: raw.buyer || "Eskom Holdings SOC Limited",
    source_name: this.sourceName,
    is_external_opportunity: true,
    is_public: true,
    status,
    estimated_budget: raw.estimated_budget || null,
    category,
    province: "National", // Eskom operates nationally
  }
}
```

---

## 5. URL Patterns & Pagination

### Base URLs
```
Listings: https://tenderbulletin.eskom.co.za/
  Query: ?pageNumber={n}&pageSize={size}
  Example: https://tenderbulletin.eskom.co.za/?pageNumber=1&pageSize=10

Detail: https://tenderbulletin.eskom.co.za/tender/{id}
  Example: https://tenderbulletin.eskom.co.za/tender/73478

Downloads: https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll
  Query: ?TENDER_ID={id}
  Example: https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID=73478

Search: https://tenderbulletin.eskom.co.za/search
  Query: ?pageSize={size}&page={n}
```

### Pagination Strategy
```typescript
async scrapeListings(): Promise<RawTender[]> {
  const tenders: RawTender[] = []
  const pageSize = 10 // Request 10 per page for efficiency
  const maxPages = 68 // Current known maximum
  
  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber++) {
    const url = `https://tenderbulletin.eskom.co.za/?pageNumber=${pageNumber}&pageSize=${pageSize}`
    
    try {
      // Fetch and parse page
      const pageTenders = await this.parsePage(url)
      tenders.push(...pageTenders)
      
      // Stop if fewer results than page size (indicates last page)
      if (pageTenders.length < pageSize) {
        console.log(`[Eskom] Reached end of tenders at page ${pageNumber}`)
        break
      }
    } catch (error) {
      console.error(`[Eskom] Error on page ${pageNumber}:`, error)
      // Don't break, continue with next page
    }
    
    // Rate limiting: 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  return tenders
}
```

---

## 6. Error Handling

```typescript
async scrapeListings(): Promise<RawTender[]> {
  const tenders: RawTender[] = []

  try {
    // Main logic here
  } catch (fetchError) {
    const errorDetails = {
      name: fetchError.name || 'Unknown',
      message: fetchError.message || String(fetchError),
      code: fetchError.code,
      status: fetchError.status,
    }
    
    console.error(`[Eskom] Fetch error:`, JSON.stringify(errorDetails))
    throw fetchError
  }

  return tenders
}

// Specific error cases:
// 1. Network timeout -> Retry with exponential backoff
// 2. 429 (Rate limited) -> Back off and continue later
// 3. 404 (Page not found) -> Log and skip
// 4. Malformed HTML -> Log warning and continue
// 5. Missing fields -> Use empty/default values, don't fail
```

---

## 7. Testing Data

### Sample Tender (Current)
```
Reference: ERI/2022/BMS/08
Title: The Provision of cleaning services for the Ash and Coal plant at Medupi and Kusile power station for Eskom Rotek Industries, for a period of 48 months on an as and when required basis
Division: ESKOM ENTERPRISES
Location: ERI GERMISTON
Closing Date: 2027-02-22 13:33:00
Published Date: 2023-05-22 13:35:12
Tender ID: 73478
Download: https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID=73478
```

### Sample Tender (Another)
```
Reference: MWP2457DXCancellatio
Title: THE SUPPLY, DELIVERY AND OFFLOADING OF INDUSTRIAL GASES...
Status: cancellation
Division: DISTRIBUTION
Location: Eskom Holdings SOC Limited Megawatt Park Tender Office...
Closing Date: 2027-05-28 10:00:00
Published Date: 2024-05-28 09:37:08
Tender ID: 79192
```

---

## 8. Schedule & Performance

### Collection Frequency
- **Recommended**: Daily (every 24 hours)
- **Rationale**: Regular updates, ~340 active tenders
- **Time per run**: ~2-4 hours (depends on rendering engine)
- **Best practice**: Run at off-peak hours (e.g., 02:00 SAST)

### Performance Metrics
```
Pages to scrape: 68
Default items per page: 5 (can request 10+)
Estimated tenders per run: 340+
Time per page: 3-5 seconds (with browser rendering)
Total time: 200-340 seconds (~5-6 minutes) with Puppeteer
Total time: 30-60 seconds (if pure HTTP when API available)
```

### Database Operations
```typescript
// Per collector run:
// - Unique tenders: ~340
// - New entries (avg per day): ~5-10
// - Updates/changes (avg): ~5-10
// - Duplicates filtered: varies
```

---

## 9. Dependencies & Libraries

### Required
```typescript
// Core
import { TenderCollectorBase, type RawTender } from "./TenderCollectorBase"
import { createClient } from "@supabase/supabase-js"

// For rendering (choose one):
// Option A: Puppeteer
import puppeteer from "puppeteer"

// Option B: Cheerio (if API available)
import cheerio from "cheerio"
```

### Optional
```typescript
// Date parsing
import { parse as parseDate } from "date-fns"

// Request handling
import axios from "axios" // or built-in fetch
```

---

## 10. Status Indicators & Categories

### Observed Status Values
- `Active` (default for non-cancelled)
- `cancellation` / `Cancellation`
- `TEAP PROCESS` (Technical Evaluation and Award Process)
- `Regret letter` (unsuccessful bid notification)

### Department/Division Mapping
```typescript
const divisionMap = {
  "DISTRIBUTION": "Distribution",
  "GENERATION": "Generation",
  "ESKOM ENTERPRISES": "Enterprises",
  "TRANSMISSION": "Transmission",
  "GOVERNANCE": "Corporate",
  // ... add as discovered
}
```

### Procurement Category Inference
```typescript
function inferCategory(description: string): string {
  const desc = description.toLowerCase()
  
  if (desc.includes("supply") && desc.includes("delivery")) return "Goods"
  if (desc.includes("construction") || desc.includes("civil")) return "Construction"
  if (desc.includes("maintenance") || desc.includes("service")) return "Services"
  if (desc.includes("consulting") || desc.includes("professional")) return "Professional Services"
  if (desc.includes("cleaning") || desc.includes("security")) return "Support Services"
  if (desc.includes("manufacturing")) return "Manufacturing"
  
  return "Procurement"
}
```

---

## 11. Success Criteria

### Data Quality
- [ ] Reference number extracted and validated
- [ ] Dates parsed correctly (handle mixed formats)
- [ ] Closing dates are in future (for active tenders)
- [ ] Location includes Eskom or facility name
- [ ] Title is meaningful (>10 chars, <200 chars)

### Completeness
- [ ] All 340+ tenders scraped without gaps
- [ ] No duplicate entries in database
- [ ] Pagination handled correctly (page 68 is last)
- [ ] All required fields present or defaulted

### Performance
- [ ] Collection completes in <6 minutes
- [ ] <2 errors per full run
- [ ] No rate-limiting/blocking
- [ ] Scheduled runs don't exceed 5 min CPU time

### Maintenance
- [ ] Handles schema changes gracefully
- [ ] Logs all extraction attempts
- [ ] Alerts on > 10% data loss
- [ ] Documents any URL/format changes

---

## 12. Deployment Checklist

- [ ] Collector class created and tests passing
- [ ] Error handling for all failure modes
- [ ] Database schema compatible (external_ocid unique)
- [ ] Supabase credentials configured
- [ ] Rate limiting appropriate (no IP bans)
- [ ] Logging configured (CloudWatch/console)
- [ ] Scheduled job created (cron or similar)
- [ ] Backup/recovery plan documented
- [ ] Performance monitoring in place
- [ ] Manual execution tested
- [ ] Production deployment completed
- [ ] Monitoring alerts configured

---

## 13. Known Limitations & Future Work

### Current Limitations
1. **No public API** - Must render full pages (slow)
2. **JavaScript-dependent** - Requires browser automation
3. **Dynamic content** - Page size shown may differ from requested
4. **Estimated budget not in listings** - Must download full documents
5. **Category inference** - No official categorization available

### Potential Improvements
1. Monitor for API endpoint release
2. Switch to pure HTTP if API becomes available
3. Extract category from tender documents
4. Add budget estimation from document text
5. Implement supplier filtering/tracking
6. Add alert system for new tenders matching criteria

### Future Enhancements
- [ ] Extract complete tender documents
- [ ] Parse document content for additional metadata
- [ ] Build supplier qualification tracking
- [ ] Implement tender change notifications
- [ ] Create tender calendar with reminders
- [ ] Add historical trend analysis

---

**Specification Version**: 1.0  
**Last Updated**: 2026-09-22  
**Status**: Ready for Implementation
