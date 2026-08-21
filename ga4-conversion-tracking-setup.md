# GA4 Conversion Tracking Setup — Phase 9C

## Overview

Track 4 key procurement actions:
1. **Signup** (new user registration)
2. **Saved Search** (user saves a tender search)
3. **Bid Submission** (user submits RFQ response)
4. **Supplier Database Access** (user filters suppliers)

---

## Step 1: Create Custom Events in GA4

### In Google Analytics 4 Console:

1. Go to **Admin** → **Custom Events**
2. Create 4 custom events:

#### Event 1: `signup`
- **Event name**: `signup`
- **Description**: User completes registration

#### Event 2: `saved_search`
- **Event name**: `saved_search`
- **Description**: User saves a tender search with filters

#### Event 3: `bid_submission`
- **Event name**: `bid_submission`
- **Description**: User submits a bid or RFQ response

#### Event 4: `supplier_db_access`
- **Event name**: `supplier_db_access`
- **Description**: User accesses/filters supplier database

---

## Step 2: Add Event Tracking Code to Your App

### Context: Where These Events Occur

**Signup Event**: Fires on `/auth/register` after successful user creation  
**Saved Search Event**: Fires from `/dashboard/saved-searches` when user saves a search  
**Bid Submission Event**: Fires from tender bidding flow when user submits bid  
**Supplier DB Access**: Fires from `/dashboard/supplier-matches` when user applies filters  

---

## Step 3: Implement Tracking in Next.js

### File: `src/lib/analyticsEvents.ts` (Create if doesn't exist)

```typescript
import { useEffect } from 'react';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export const analyticsEvents = {
  // Fire when user successfully signs up
  trackSignup: (userId: string, signupMethod: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'signup', {
        method: signupMethod, // 'email', 'google', etc.
        user_id: userId,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Fire when user saves a search
  trackSavedSearch: (searchQuery: string, category?: string, location?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'saved_search', {
        search_query: searchQuery,
        category: category || 'all',
        location: location || 'all',
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Fire when user submits a bid
  trackBidSubmission: (tenderValue?: number, category?: string, tenderId?: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'bid_submission', {
        tender_value: tenderValue || 0,
        category: category || 'unknown',
        tender_id: tenderId,
        timestamp: new Date().toISOString(),
      });
    }
  },

  // Fire when user accesses supplier database with filters
  trackSupplierDBAccess: (filters: {
    industry?: string;
    location?: string;
    bbbeeLevel?: string;
    cidbGrade?: string;
  }) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'supplier_db_access', {
        industry: filters.industry || 'all',
        location: filters.location || 'all',
        bbbee_level: filters.bbbeeLevel || 'any',
        cidb_grade: filters.cidbGrade || 'any',
        timestamp: new Date().toISOString(),
      });
    }
  },
};
```

---

## Step 4: Integrate Events Into Existing Pages

### In `/src/app/auth/register/page.tsx` (Signup)

```typescript
import { analyticsEvents } from '@/lib/analyticsEvents';

// After successful signup:
const handleSignupSuccess = (userId: string) => {
  analyticsEvents.trackSignup(userId, 'email');
  // ... redirect to dashboard
};
```

### In `/src/app/dashboard/saved-searches/page.tsx` (Saved Search)

```typescript
import { analyticsEvents } from '@/lib/analyticsEvents';

const handleSaveSearch = (searchQuery: string, category?: string, location?: string) => {
  // ... save search to database
  analyticsEvents.trackSavedSearch(searchQuery, category, location);
};
```

### In Bid Submission Flow (wherever bidding happens)

```typescript
import { analyticsEvents } from '@/lib/analyticsEvents';

const handleBidSubmit = (tenderValue?: number, category?: string, tenderId?: string) => {
  // ... submit bid to API
  analyticsEvents.trackBidSubmission(tenderValue, category, tenderId);
};
```

### In `/src/app/dashboard/supplier-matches/page.tsx` (Supplier DB)

```typescript
import { analyticsEvents } from '@/lib/analyticsEvents';

const handleFilterSuppliers = (filters: { industry?: string; location?: string; ... }) => {
  analyticsEvents.trackSupplierDBAccess(filters);
  // ... fetch filtered suppliers
};
```

---

## Step 5: Create GA4 Conversion Goals

### In Google Analytics 4 Console:

1. Go to **Admin** → **Conversions**
2. Click **New Conversion Event**
3. Create 4 conversions:

| Conversion Name | Event Name | Description |
|---|---|---|
| `signup` | `signup` | User registration completion |
| `saved_search` | `saved_search` | User saves a tender search |
| `bid_submission` | `bid_submission` | User submits bid/RFQ |
| `supplier_db_access` | `supplier_db_access` | User accesses supplier database |

---

## Step 6: Create GA4 Custom Report

### Track Conversion Performance by Content

1. Go to **Reports** → **Explorations** → **+** (New Exploration)
2. Select **Data Source**: "Web"
3. **Dimensions**:
   - Landing Page / Page Path
   - Event Name
4. **Metrics**:
   - Users
   - Events
   - Conversion Rate
5. **Filters**: (Optional) Filter by date range, traffic source, etc.

This shows: Which blog articles (landing pages) drive signup/bid/search events.

---

## Step 7: Track Content-to-Conversion

### Custom Report: Blog Content → Conversion

Create a report to answer: "Which blog articles drive the most signups/bids?"

1. **Explorations** → **New**
2. **Dimensions**: `Landing Page` (add as rows)
3. **Metrics**: `Signup Conversions`, `Bid Submission Conversions`
4. **Filter**: Rows where `Landing Page` contains `/blog/` or your blog path

**Result**: Rank blog articles by conversion value.

---

## Step 8: Track Keyword → Conversion

### Custom Report: Organic Keywords → Conversions

1. **Reports** → **Acquisition** → **Traffic Acquisition**
2. Add secondary dimension: `Keyword` (from Organic Search)
3. Add metric: `Signup Conversions`, `Bid Submission Conversions`

**Result**: Which search keywords drive actual signups/bids (not just traffic).

---

## Implementation Checklist

- [ ] Create `/src/lib/analyticsEvents.ts` with event tracking functions
- [ ] Add `trackSignup()` call to signup page
- [ ] Add `trackSavedSearch()` call to saved searches flow
- [ ] Add `trackBidSubmission()` call to bid submission flow
- [ ] Add `trackSupplierDBAccess()` call to supplier-matches page
- [ ] Create 4 custom events in GA4 console
- [ ] Create 4 conversion goals in GA4 console
- [ ] Create custom reports for content → conversion tracking
- [ ] Deploy to production
- [ ] Verify events firing in GA4 Realtime (wait 24-48 hours for data)

---

## Verification: Check Events Are Firing

1. **Go to GA4 Console** → **Realtime**
2. Trigger a signup / save search / bid on your site
3. You should see the event appear in Realtime dashboard within 5-10 seconds

---

## Expected Results (4-6 Weeks)

- **Blog articles ranking**: 20-30 keywords in top 10
- **Organic traffic**: 100-200 clicks/day
- **Conversion rate**: 2-5% of organic traffic = 2-10 signups/day from organic
- **High-value keywords**: Identify which blog topics convert best

Example: If "How to Register on CSD" article ranks #3 for "CSD registration" (90 searches/mo), it might drive 20-30 clicks/month → 1-2 signups/month from that keyword alone.
