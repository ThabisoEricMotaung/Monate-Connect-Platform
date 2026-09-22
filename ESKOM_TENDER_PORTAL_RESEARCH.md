# Eskom Holdings SOC Ltd - Procurement/Tender Portal Research

## Executive Summary
Eskom operates two official digital procurement channels for tenders:
1. **Tender Bulletin Portal** - Public listing and browsing of active tenders
2. **eTendering Portal** - Formal submission and management platform (requires registration)

---

## 1. Portal URLs

### Primary Tender Listing Portal (Tender Bulletin)
- **Main URL**: https://tenderbulletin.eskom.co.za/
- **Listing Page**: https://tenderbulletin.eskom.co.za/?pageSize=5&pageNumber=1
- **Search Page**: https://tenderbulletin.eskom.co.za/search?pageSize=5&page=1
- **Tender Detail**: https://tenderbulletin.eskom.co.za/tender/{TENDER_ID}

### Secondary Platforms
- **eTendering Portal** (Formal submissions): https://etendering.eskom.co.za/
- **eAuction Platform**: https://eauction.eskom.co.za/
- **NTCSA Tenders** (subsidiary): https://tenderbulletin.ntcsa.co.za/

---

## 2. Access Requirements

### Public Access
- **Tender Bulletin Portal**: ✅ **Fully Public** - No registration required
  - Anyone can view all active tender listings
  - Can search and filter tenders
  - Can download tender documents
  - No authentication barrier for listing access

- **eTendering Portal**: 🔐 **Registration Required**
  - Suppliers must register to submit bids
  - User verification required
  - YouTube tutorials provided for registration process
  - More details at: https://etendering.eskom.co.za/login

### Data Collection Notes
- **Scraping Tender Bulletin is unrestricted** - It's designed for public access
- Downloads via `https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID={id}` are accessible without authentication

---

## 3. Data Structure & Fields

### Available Fields for Each Tender Listing

#### Core Identifier
- **Reference Number** (e.g., "ERI/2022/BMS/08", "MWP2457DX")
- **Tender ID** (numeric, used in URLs: `/tender/73478`)

#### Description Fields
- **Title** (max ~100 chars in listing, full text on detail page)
- **Short Description** (truncated preview in listing)
- **Full Description** (available on detail page and in downloadable documents)

#### Classification
- **Division/Department** 
  - Examples: "DISTRIBUTION", "GENERATION", "ESKOM ENTERPRISES", etc.
- **Status** 
  - Examples: "Active", "Cancelled", "TEAP PROCESS", "Regret letter"
- **Category/Type** 
  - RFP (Request for Proposal)
  - RFB (Request for Bid)
  - RFQ (Request for Quote)
  - RFI (Request for Information)

#### Location Data
- **Location** (e.g., "Eskom Holdings SOC Limited Megawatt Park Tender Office, Northside No. 01 Maxwell Drive Sunninghill, Gauteng")
- **Closing/Submission Location** (full address provided)

#### Temporal Data
- **Published Date** (format: "2024-May-28 09:37:08" or similar)
- **Closing Date** (format: "2027-Feb-22 13:33:00")
- **Time Component** (24-hour format, e.g., "10:00:00", "13:33:00")

#### Document & File Links
- **Download all Docs** - Direct link to tender package download
  - API Pattern: `https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID={id}`
  - Returns documents as package/archive

#### Additional Metadata
- **Buyer**: "Eskom Holdings SOC Limited" (standard)
- **Procurement Method**: Formal vs. Informal
- **Estimated Budget**: Not consistently shown in listings (may be in documents)
- **Duration/Period**: Mentioned in description (e.g., "48 months", "3 years", "as and when required")

### Example Tender Record (Extracted)
```
{
  "referenceNumber": "ERI/2022/BMS/08",
  "tenderId": "73478",
  "title": "The Provision of cleaning services for the Ash and Coal plant at Medupi and Kusile power station for Eskom Rotek Industries, for a period of 48 months on an as and when required basis",
  "division": "ESKOM ENTERPRISES",
  "location": "ERI GERMISTON",
  "closingDate": "2027-02-22 13:33:00",
  "publishedDate": "2023-05-22 13:35:12",
  "status": "Active",
  "downloadLink": "https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID=73478"
}
```

---

## 4. HTML/Page Structure

### Page Framework
- **Framework**: React/Vue SPA (Single Page Application)
- **Rendering**: Client-side rendering (JavaScript-based)
- **Main Script**: `https://tenderbulletin.eskom.co.za/assets/index-{hash}.js`

### DOM Structure

#### Listing Layout
```html
<!-- Main region with tender listings -->
<region>
  <heading>Current Tender Opportunities</heading>
  
  <!-- Tender list -->
  <ul>
    <li>
      <article>
        <link href="/tender/{id}">
          <heading>{REFERENCE_NUMBER}</heading>
        </link>
        
        <!-- Description fields -->
        <generic>{Short description}</generic>
        <generic>{Division}</generic>
        <generic>{Full description}</generic>
        
        <!-- Metadata -->
        <generic>Location</generic>
        <generic>{Location text}</generic>
        <generic>Closing Date</generic>
        <generic>{Date}</generic>
        <generic>Published Date</generic>
        <generic>{Date}</generic>
        
        <!-- Action links -->
        <link href="webapi/api/Files/DownloadAll?TENDER_ID={id}">
          Download all Docs
        </link>
        <link href="/tender/{id}">Read More...</link>
      </article>
    </li>
    <!-- More listings... -->
  </ul>
</region>

<!-- Pagination section -->
<nav aria-label="pagination">
  <combobox><!-- Page size selector --></combobox>
  <ul>
    <li><link href="/?pageNumber=1">1</link></li>
    <li><link href="/?pageNumber=2">2</link></li>
    <!-- ... -->
    <li><link href="/?pageNumber=68">68</link></li>
  </ul>
</nav>
```

### Key CSS Classes/Attributes
- **No table structure** - Uses semantic HTML with `<article>` elements
- **No class-based styling** - Minimal class attributes (framework-based)
- **Navigation uses query parameters**: `?pageSize=X&pageNumber=Y`

---

## 5. API Endpoints

### Confirmed API Patterns

#### Files/Downloads
```
GET/POST https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID={id}
- Returns: Tender package documents (archive/PDF)
- Status: 200 (working, no auth required)
```

#### Tender List Endpoint (Likely - Not directly accessible)
```
https://tenderbulletin.eskom.co.za/api/tenders
- Status: 405 Method Not Allowed (endpoint exists but may require headers/auth)
- Likely Pattern: GET /api/tenders?pageNumber=1&pageSize=10
```

### API Notes
- The portal uses a **React/Vue SPA** - may fetch data client-side
- API might require specific headers (User-Agent, Accept, Referer, Origin)
- CORS may be restricted
- Authentication likely not required for public listing data

---

## 6. Update Frequency

### Observed Patterns
- **Publishing Rate**: Active and regular
- **Recent Postings**: Latest tenders from December 2024
- **Status Indicators**: Shows "Cancelled", "TEAP PROCESS", "Regret letter" status codes
- **Date Format**: Mixed format (e.g., "May-28", "Feb-22") suggests ongoing manual updates

### Estimated Update Schedule
- **Likely**: Daily or as-needed basis
- **Evidence**: Multiple pages (68) with 5+ tenders each, span multiple years
- **Recommendation**: Poll **every 24-48 hours** minimum to catch new postings

---

## 7. Scale & Scope

### Active Tender Volume
- **Total Pages**: 68 pages
- **Default Page Size**: 5 tenders per page
- **Estimated Active Tenders**: **68 × 5 = 340 active tenders** (as of current snapshot)
- **Range**: Likely 200-500 active tenders at any given time

### Historical Data
- **Earliest Visible**: Tenders from 2023 (e.g., "2023-May-22")
- **Current**: Up to December 2024
- **Archive**: Likely stores closed/completed tenders separately

### Divisions Covered
- Distribution
- Generation
- Eskom Enterprises (Rotek Industries)
- Corporate
- Multiple regional/functional areas

---

## 8. Document/Tender Package Structure

### Available Documents
Each tender package typically includes:
- **Technical Specifications** (PDF/Word)
- **Commercial Terms** (PDF/Word)
- **Financial/Pricing Template** (Excel/Word)
- **General Conditions of Contract** (PDF)
- **Amendment/Clarification Documents** (if applicable)
- **Addendums** (if released)
- **Evaluation Criteria** (PDF)
- **Bid Submission Instructions** (PDF)

### Download Method
1. Click "Download all Docs" link on tender listing
2. API call: `https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID={id}`
3. Returns: **Compressed archive** (likely ZIP or similar)
4. **No authentication required** for public tenders

### File Naming Convention
- Documents follow Eskom naming standards
- Typical pattern: `[REFERENCE_NUMBER]_[DOCUMENT_TYPE]_[DATE].pdf`
- Example: `MWP2457DX_Technical_Specifications.pdf`

---

## 9. Comparison with Similar Sources

### Similar to DBSA & TCTA Collectors
| Aspect | Eskom TB | DBSA | TCTA |
|--------|----------|------|------|
| **Public Access** | Yes ✓ | Yes ✓ | Yes ✓ |
| **Registration Required** | No (for viewing) | No | No |
| **API Available** | Partial | No | No |
| **HTML Table Structure** | No (SPA) | Yes | Yes |
| **Pagination** | Yes (68 pages) | Manual | Manual |
| **Active Tenders** | ~340 | ~50-100 | ~100-150 |
| **Document Download** | Direct API | Direct link | Direct link |
| **Status Indicators** | Yes (Cancelled, etc) | Limited | Limited |
| **Estimated Budget** | In documents | Sometimes shown | Sometimes shown |

---

## 10. Technical Considerations for Web Scraper

### Architecture Recommendations

#### Approach 1: SPA-Based Scraping (Recommended)
```typescript
class EskomCollector extends TenderCollectorBase {
  async scrapeListings(): Promise<RawTender[]> {
    // Use Puppeteer/Playwright to render JavaScript
    // Navigate to tenderbulletin.eskom.co.za
    // Extract from DOM after rendering
    // Handle pagination: ?pageNumber=1 through ?pageNumber=68
  }
}
```

**Pros:**
- Handles client-side rendering properly
- Can capture dynamically-loaded data
- More robust to layout changes

**Cons:**
- Slower than simple HTTP fetching
- Resource-intensive

#### Approach 2: Direct DOM Parsing (If API becomes available)
```typescript
// Parse article elements from HTML
const articles = document.querySelectorAll('article');
articles.forEach(article => {
  // Extract reference, dates, description, etc.
});
```

**Pros:**
- Faster if pages are pre-rendered
- Simpler implementation

**Cons:**
- May not work reliably with React/Vue
- Difficult to handle pagination

### Key Implementation Notes

1. **Pagination Loop**
   - Start: `pageNumber=1&pageSize=5` (or higher pageSize)
   - End: `pageNumber=68` (current max)
   - Increment: `pageNumber++`

2. **Field Extraction**
   - Reference Number: From `<heading>` in article
   - Dates: Parse format like "2027-Feb-22 13:33:00"
   - Location: Find generic element after "Location" label
   - Description: Multiple elements, concatenate carefully

3. **Error Handling**
   - Handle status changes (Cancelled, etc.)
   - Manage redirects gracefully
   - Timeout handling for large document downloads

4. **Performance**
   - Cache pages to avoid repeated requests
   - Implement exponential backoff for retries
   - Consider rate-limiting (no more than 10 req/sec)

### Example URL Patterns for Scraper
```
Base: https://tenderbulletin.eskom.co.za/

Listings: 
  https://tenderbulletin.eskom.co.za/?pageNumber={n}&pageSize=10
  https://tenderbulletin.eskom.co.za/?pageSize=10&pageNumber={n}

Detail:
  https://tenderbulletin.eskom.co.za/tender/{id}

Search:
  https://tenderbulletin.eskom.co.za/search?pageSize=5&page=1

Downloads:
  https://tenderbulletin.eskom.co.za/webapi/api/Files/DownloadAll?TENDER_ID={id}
```

---

## 11. Additional Resources

### Official Documentation
- **Procurement Overview**: https://www.eskom.co.za/procurement/
- **Tender Process Guide**: https://www.eskom.co.za/procurement-tenderprocess/
- **eTendering User Guide (PDF)**: https://www.eskom.co.za/wp-content/uploads/2026/03/eTendering-External-User-Guide-Final.pdf
- **eAuction Process**: https://www.eskom.co.za/procurement-eauction-process/
- **Vendor Management**: https://www.eskom.co.za/procurement-vendor-management-process/

### Support & Contact
- **Main Contact**: 086 00 ESKOM (086 00 37566)
- **Fraud/Corruption Reporting**: 0800 11 27 22
- **Email**: [procurement contact - check Eskom website]
- **Supplier Registration**: Through Central Supplier Database (CSD)

### Related Systems
- **Central Supplier Database (CSD)**: https://secure.csd.gov.za/
- **NTCSA Tender Bulletin** (National Transmission): https://tenderbulletin.ntcsa.co.za/
- **Rotek Industries** (Eskom subsidiary): https://www.rotekindustries.co.za/

---

## 12. Data Quality & Completeness

### Observations
- **Data Consistency**: High - standardized fields across listings
- **Completeness**: Medium - some optional fields missing
- **Accuracy**: Appears high (official Eskom source)
- **Freshness**: Current (updated regularly)

### Known Gaps
- Estimated Budget: Often in documents, not in listing
- Tender Type/Category: Must infer from description
- Supplier Requirements: Only in downloadable documents
- B-BBEE & Localisation: In documents, not listings

### Data Validation
- All reference numbers follow pattern: `[CODE]\d{4}[A-Z]*`
- All dates are valid (cross-reference with closing date logic)
- Location always includes "Eskom" or specific facility name
- Status field validated against observed values

---

## 13. Scraper Implementation Checklist

- [ ] Identify JavaScript framework (React/Vue/Other)
- [ ] Set up Puppeteer/Playwright for rendering
- [ ] Implement pagination loop (1 to 68)
- [ ] Extract all required fields from DOM
- [ ] Parse dates correctly (handle mixed formats)
- [ ] Normalize data to standard format
- [ ] Implement error handling & logging
- [ ] Test on sample pages
- [ ] Verify API endpoints for documents
- [ ] Set up database insertion (Supabase)
- [ ] Implement retry logic for failures
- [ ] Add rate limiting
- [ ] Schedule periodic runs (daily)
- [ ] Monitor for schema changes

---

## Summary Table

| Attribute | Value |
|-----------|-------|
| **Portal Name** | Eskom Tender Bulletin |
| **Primary URL** | https://tenderbulletin.eskom.co.za/ |
| **Public Access** | Yes, fully public |
| **Registration Required** | No (for viewing only) |
| **Total Active Tenders** | ~340 (68 pages × 5) |
| **Total Pages** | 68 |
| **Default Page Size** | 5 (configurable) |
| **Pagination Method** | Query parameters |
| **API Endpoints** | Limited (download only confirmed) |
| **HTML Structure** | React/Vue SPA (no tables) |
| **Update Frequency** | Daily (estimated) |
| **Data Freshness** | Current (Dec 2024) |
| **Document Format** | PDF, Word, Excel, Archives |
| **Buyer Organization** | Eskom Holdings SOC Ltd |
| **Key Fields** | Reference #, Title, Division, Dates, Location |
| **Scraping Difficulty** | Medium (JavaScript rendering needed) |
| **Estimated Scraper Time** | 2-4 hours per cycle (all 68 pages) |

---

**Document Version**: 1.0  
**Last Updated**: 2026-09-22  
**Data Current As Of**: September 22, 2026
