# Phase 9 Deployment Checklist

## Articles Status

✅ **COMPLETE & READY TO DEPLOY**:
1. ✓ Supplier Database South Africa (2,800 words)
2. ✓ CSD Registration Guide (2,600 words)
3. ✓ CIDB Grading Explained (2,400 words)

📝 **IN PROGRESS** (Outlines ready, need writing):
4. B-BBEE Verification (outline: phase-9-content-outlines.md)
5. Tender Alerts Feature (outline: phase-9-content-outlines.md)
6. Government Procurement Opportunities (outline provided)
7. Procurement Software for SMEs (outline provided)
8. Winning Tender Response Guide (outline provided)
9. SARS Tax Clearance (outline provided)
10. Supplier Verification Hub (outline provided)

---

## Step 1: Deploy Articles 1-3 Immediately

### File: `src/app/blog/posts/`

Create blog post files:

```
src/app/blog/posts/
├── supplier-database-south-africa.mdx
├── csd-registration-guide.mdx
└── cidb-grading-explained.mdx
```

**Instructions**:
1. Copy article content from markdown files
2. Add frontmatter (title, description, date, author, tags)
3. Optimize for SEO (meta description, keywords in intro/headers)
4. Add internal links to other articles
5. Deploy to production

### Example Frontmatter:

```yaml
---
title: "Supplier Database South Africa: Free Directory of Verified Suppliers"
description: "Find verified suppliers in South Africa instantly. Access our free supplier database with CIDB, B-BBEE, and CSD-certified companies."
date: "2026-08-20"
author: "AiForm Procure"
category: "Procurement Guide"
tags: ["supplier database", "suppliers", "procurement", "south africa"]
readTime: "8 min"
---
```

---

## Step 2: Add Internal Linking

### Links Between Articles:

**In Article 1 (Supplier Database)**:
- Link to Article 2 (CSD Registration) — "Verify supplier's CSD number"
- Link to Article 3 (CIDB Grading) — "Check CIDB contractor grades"
- Link to Article 4 (B-BBEE) — "Verify B-BBEE certification"

**In Article 2 (CSD Registration)**:
- Link to Article 1 (Supplier Database) — "Register to be discoverable"
- Link to Article 3 (CIDB) — "Get CIDB grading as contractor"
- Link to Article 9 (Tax Clearance) — "Stay tax compliant"

**In Article 3 (CIDB Grading)**:
- Link to Article 1 (Supplier Database) — "Update your profile with grading"
- Link to Article 2 (CSD) — "Also register on CSD"
- Link to Article 5 (Tender Alerts) — "Start bidding on tenders"

**Pattern**: Every article links to 2-3 others contextually.

---

## Step 3: Update Homepage & Navigation

### Add Blog Section to Homepage

```html
<section class="py-12 bg-gray-50">
  <h2>Procurement Guides & Resources</h2>
  <p>Learn how to navigate government procurement, supplier verification, and tender bidding.</p>
  
  <div class="grid md:grid-cols-3 gap-6">
    <!-- Article 1 Card -->
    <a href="/blog/supplier-database-south-africa">
      <h3>Supplier Database South Africa</h3>
      <p>Find verified suppliers by CIDB, B-BBEE, location...</p>
      <span>Read 8 min</span>
    </a>
    
    <!-- Article 2 Card -->
    <a href="/blog/csd-registration-guide">
      <h3>CSD Registration Guide</h3>
      <p>Step-by-step guide to registering on Central Supplier Database...</p>
      <span>Read 7 min</span>
    </a>
    
    <!-- Article 3 Card -->
    <a href="/blog/cidb-grading-explained">
      <h3>CIDB Grading Explained</h3>
      <p>Understand contractor grades 1-9, requirements, and how to apply...</p>
      <span>Read 8 min</span>
    </a>
  </div>
</section>
```

### Navigation Menu Update

Add "Resources" or "Blog" link:
- `/blog` — Blog hub with all articles
- `/blog/guides` — Procurement guides category

---

## Step 4: Implement GA4 Conversion Tracking

### File: `src/lib/analyticsEvents.ts`

Create file with event tracking functions (see `ga4-conversion-tracking-setup.md` for full code):

```typescript
export const analyticsEvents = {
  trackSignup: (userId: string, signupMethod: string) => { ... },
  trackSavedSearch: (searchQuery: string, category?: string) => { ... },
  trackBidSubmission: (tenderValue?: number, category?: string) => { ... },
  trackSupplierDBAccess: (filters: object) => { ... },
};
```

### Integration Points:

- **Signup**: `/src/app/auth/register/page.tsx` → Call `trackSignup()` after successful registration
- **Saved Search**: `/src/app/dashboard/saved-searches/page.tsx` → Call `trackSavedSearch()`
- **Bid Submission**: Bidding flow → Call `trackBidSubmission()`
- **Supplier DB**: `/src/app/dashboard/supplier-matches/page.tsx` → Call `trackSupplierDBAccess()`

### GA4 Console Setup:

1. Create 4 custom events in GA4
2. Create 4 conversion goals
3. Create custom report: Blog content → Conversion

---

## Step 5: Submit to Search Console

1. Deploy all articles
2. Go to Google Search Console
3. Click "New URL inspection"
4. Enter each blog post URL:
   - `/blog/supplier-database-south-africa`
   - `/blog/csd-registration-guide`
   - `/blog/cidb-grading-explained`
5. Click "Request Indexing"

---

## Step 6: Write Articles 4-10

**Timeline**: 2-3 articles per day (use outlines in `phase-9-content-outlines.md`)

### Articles 4-5 (Next Batch):

**Article 4: B-BBEE Verification** (2-3K words)
- Outline ready
- Focus on B-BBEE levels, how to get certified, government requirements
- High intent: Companies wanting to improve their B-BBEE rating

**Article 5: Tender Alerts Feature** (2-3K words)
- Outline ready
- Soft product feature (educates about benefits)
- CTAs to sign up for alerts

---

## Monitoring & Measurement (4-6 Weeks)

### Weekly Tracking:

1. **Search Rankings**
   - Track 30 keywords in GSC
   - Monitor position movement from 30+ to page 1
   - Goal: Move 5-10 keywords to top 10 per week

2. **Traffic & Engagement**
   - Organic clicks to articles (GA4)
   - Avg time on page (target: 2-3 min)
   - CTR from blog to product pages

3. **Conversions**
   - Signup events from organic traffic
   - Saved search events (feature discovery)
   - Bid submission events (measure impact)

### Expected Results (Week 4):

- **Articles 1-3 ranking**: Position 5-15 for target keywords
- **Organic traffic**: 50-100 clicks/day
- **Conversions**: 1-3 signups/day from blog traffic
- **Engagement**: 40%+ of organic visitors spend 2+ min on articles

---

## Files Ready to Deploy

```
content-pillar-1-supplier-database.md          ✓ Ready
content-pillar-2-csd-registration.md           ✓ Ready
content-pillar-3-cidb-grading.md               ✓ Ready
phase-9-content-outlines.md                    → Use for Articles 4-10
ga4-conversion-tracking-setup.md               → Implementation guide
phase-9-deployment-checklist.md                ← You are here
```

---

## Next Action Items

### Immediate (Today):
- [ ] Review Articles 1-3 for quality
- [ ] Add frontmatter & deploy to blog
- [ ] Add blog section to homepage
- [ ] Submit to Google Search Console

### This Week:
- [ ] Write Articles 4-5
- [ ] Implement GA4 event tracking
- [ ] Create GA4 custom reports
- [ ] Deploy Articles 4-5

### Next 2 Weeks:
- [ ] Write Articles 6-10
- [ ] Deploy remaining articles
- [ ] Monitor GSC & GA4 for keyword movements
- [ ] Adjust internal linking based on rankings

### Week 4+:
- [ ] Monitor ranking movements (target: 20-30 keywords top 10)
- [ ] Track conversion funnel (organic → signup → bid)
- [ ] Optimize high-traffic, low-conversion articles
- [ ] Plan Phase 10 (content updates, new topics)

---

## Success Metrics

| Metric | Target | Timeline |
|---|---|---|
| Keywords ranking top 10 | 20-30 | 4-6 weeks |
| Organic clicks/day | 100-200 | 4-6 weeks |
| Avg time on page | 2-3 min | 2-3 weeks |
| Signup conversion rate | 2-5% | 4-6 weeks |
| Homepage traffic from blog | 30-40% | 6+ weeks |

---

## Questions?

If articles need adjustment before deploying, iterate now. Once deployed, rankings typically move slowly (2-4 weeks per position improvement), so quality > speed.

**Recommended**: Deploy Articles 1-3 today, then write 4-5 in parallel with GA4 implementation.
