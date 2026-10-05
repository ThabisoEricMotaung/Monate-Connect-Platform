# Week 1 UI Integration Guide
## Linked Enterprises & Performance Concerns

### Components Created
1. **LinkEntitiesForm.tsx** — Supplier disclosure form (directors, beneficial owners, related companies)
2. **LinkEntitiesGallery.tsx** — Display list of disclosed entities with verification status
3. **PerformanceConcernForm.tsx** — Buyer concern submission form

---

## Integration: Supplier Profile (Linked Enterprises Tab)

### Location
`src/app/dashboard/profile/page.tsx`

### Add to Profile Tabs
After the existing tabs (Documents, Business Details, etc.), add:

```tsx
// In the tab list section (around line where you render tabs)
tabs = [
  // ... existing tabs
  { id: "linked-enterprises", label: "Linked Enterprises" },
]
```

### Add Tab Content
After the existing tab content sections, add:

```tsx
{activeTab === "linked-enterprises" && (
  <div className="space-y-6">
    <div>
      <h2 className="mb-2 text-lg font-bold text-heading">Linked Enterprises</h2>
      <p className="mb-6 text-sm text-secondary">
        Disclose your directors, beneficial owners, and related companies. Transparency builds trust with procurement bodies.
      </p>
    </div>

    {/* Add New Entity Form */}
    <LinkEntitiesForm supplierId={profile.id} onSuccess={() => {
      // Refresh the entities list
      getSupplierRelatedEntities(supabase, profile.id).then(setLinkedEntities)
    }} />

    {/* Display Existing Entities */}
    <div>
      <h3 className="mb-4 text-base font-semibold text-heading">Your Disclosed Entities</h3>
      <LinkEntitiesGallery supplierId={profile.id} supabase={supabase} />
    </div>

    {/* Info Box */}
    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
      <strong>Why disclose?</strong>
      <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
        <li>Prevent conflicts of interest and ensure transparency</li>
        <li>Meet beneficial-ownership compliance requirements</li>
        <li>Strengthen your SmartScore (transparency bonus)</li>
        <li>Give procurement bodies full context about your company structure</li>
      </ul>
    </div>
  </div>
)}
```

### Import Statements
At the top of `profile/page.tsx`, add:

```tsx
import LinkEntitiesForm from "@/components/LinkEntitiesForm"
import LinkEntitiesGallery from "@/components/LinkEntitiesGallery"
import { getSupplierRelatedEntities } from "@/lib/supplierRelatedEntities"
```

---

## Integration: Buyer Dashboard (Performance Concerns)

### Location
**New page:** `src/app/dashboard/buyer/performance-concerns/page.tsx`

### Create Page
Create the new page file with:

```tsx
"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import PerformanceConcernForm from "@/components/PerformanceConcernForm"
import { getSupplierPerformanceRecords, type SupplierPerformanceRecord } from "@/lib/performanceRecords"

export default function PerformanceConcernsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [buyerId, setBuyerId] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [concerns, setConcerns] = useState<SupplierPerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/signin")
        return
      }

      setBuyerId(user.id)
      const supplierIdParam = searchParams.get("supplierId")
      if (supplierIdParam) {
        setSupplierId(supplierIdParam)
        const records = await getSupplierPerformanceRecords(supabase, supplierIdParam)
        setConcerns(records)
      }

      setLoading(false)
    }

    loadData()
  }, [router, searchParams])

  if (!supplierId) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl rounded-md border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-700">
          <strong>No supplier selected.</strong> Use the supplier search to select a supplier before reporting a performance concern.
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-heading">Performance Concerns</h1>
        <p className="mb-6 text-secondary">Report performance issues with specific details. The supplier has 7 days to respond.</p>

        {/* Submission Form */}
        <div className="mb-8">
          <PerformanceConcernForm
            buyerId={buyerId}
            supplierId={supplierId}
            onSuccess={() => {
              // Refresh the list
              getSupplierPerformanceRecords(supabase, supplierId).then(setConcerns)
            }}
          />
        </div>

        {/* Existing Concerns */}
        {concerns.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-bold text-heading">Your Submitted Concerns</h2>
            <div className="space-y-3">
              {concerns.map((concern) => (
                <div key={concern.id} className="rounded-md border border-panel bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-heading">{concern.source_contract_title}</h3>
                      <p className="text-xs text-secondary capitalize">{concern.concern_type.replace(/_/g, " ")}</p>
                    </div>
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                      concern.severity === "critical" ? "bg-rose-100 text-rose-700" :
                      concern.severity === "major" ? "bg-orange-100 text-orange-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {concern.severity}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-secondary">{concern.description}</p>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <span>Status: <strong>{concern.status}</strong></span>
                    {concern.date_occurred && (
                      <span>• Occurred: {new Date(concern.date_occurred).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

### Import Statements
```tsx
import PerformanceConcernForm from "@/components/PerformanceConcernForm"
import { getSupplierPerformanceRecords } from "@/lib/performanceRecords"
```

---

## Navigation / Links

### Add to Buyer Dashboard Menu
Update the buyer dashboard navigation to include:
```
Performance Concerns → /dashboard/buyer/performance-concerns?supplierId=[supplier_id]
```

### Add to Supplier Profile Menu
Update profile tabs to show:
```
Documents | Business Details | Linked Enterprises | ... (existing tabs)
```

---

## Testing Checklist (Week 1)

### Supplier: Linked Entities
- [ ] Load supplier profile, navigate to "Linked Enterprises" tab
- [ ] Click "Add Linked Entity"
- [ ] Fill form: director name, relationship, evidence type
- [ ] Upload a test PDF/image (optional)
- [ ] Submit → entity appears in gallery with "Self-Disclosed" badge
- [ ] Verify audit log records the disclosure
- [ ] Test editing/removing an entity (add later in Week 2)

### Buyer: Performance Concerns
- [ ] Navigate to performance concerns page (with valid supplierId)
- [ ] Click "Report Performance Concern"
- [ ] Fill form: contract title, concern type, severity, description
- [ ] Upload evidence file (optional)
- [ ] Submit → concern appears in list
- [ ] Verify concern record exists in database with correct status="open"
- [ ] Verify audit log records submission

### UI/UX
- [ ] All forms validate required fields
- [ ] Error messages display clearly
- [ ] Loading states work
- [ ] Responsive on mobile
- [ ] Colors/styling consistent with existing design system

---

## Database Verification

Before testing, ensure migrations have run:

```bash
# Check if tables exist
psql -U postgres -h localhost -d postgres -c "
  SELECT tablename FROM pg_tables
  WHERE tablename IN (
    'supplier_related_entities',
    'enterprise_links',
    'supplier_performance_records',
    'performance_responses',
    'performance_resolution'
  )
;"
```

All 5 tables should be present.

---

## Messaging / Content Updates

### Supplier Profile (Linked Enterprises)
✓ Added in components:
- "Disclose your directors, beneficial owners, and related companies."
- "Transparency strengthens your SmartScore"
- "Legitimate businesses often have related entities—disclosure builds credibility"

### Buyer Dashboard (Performance Concerns)
✓ Added in components:
- "Document performance issues with specific details and evidence"
- "The supplier will have 7 days to respond"
- "This is not a disqualification—context matters in procurement decisions"

### Update Platform Copy (Week 1)
- [ ] Add "Linked Enterprises" to compliance messaging
- [ ] Add "Performance Transparency" to help center
- [ ] Link Bergstan judgment in buyer guidance

---

## Next Steps (Week 2)

Once Week 1 is verified:
1. **Admin Explorer** — start enterprise-links visualization
2. **Supplier Response Form** — allow suppliers to respond to concerns
3. **Email Notifications** — send when concern is submitted, response deadline
4. **Performance Dashboard** — admin assessment/resolution workflow

---

## Known Limitations / TODOs

- [ ] Email notifications not yet implemented (Week 2)
- [ ] Edit/delete entity functionality not yet added (Phase 2)
- [ ] Enterprise graph visualization not yet added (Phase 3)
- [ ] Supplier response form not yet added (Phase 2)
- [ ] SmartScore transparency bonus logic not yet added (Week 5+)
