# Thuso Testing Guide

## Fixes Applied

### 1. **RFQ Context Validation** ✅
- `fetchRfqContext()` now filters for active RFQs only (status: "Open" or "Closing Soon")
- Validates closing date is in the future
- Old/closed RFQs will no longer be loaded into Thuso context

### 2. **Improved Chat System Prompts** ✅
- Better handling when no specific RFQ context is available
- Thuso can now provide general procurement guidance without RFQ context
- Focus on current/active data when available

## How to Test with Real Matched RFQs

### Option A: Use Supabase SQL Editor (Quickest)

1. Open Supabase Dashboard → SQL Editor
2. Copy and run the SQL from `scripts/create-test-rfq.sql`
3. This creates:
   - A new active RFQ: "Software Development Services - Web Platform"
   - Status: Open (valid for 30 days)
   - Category: Information Technology
   - Budget: R250,000
   - Automatically matches to test suppliers

### Option B: Manual Data Entry via Supabase UI

1. Go to Supabase Dashboard → rfqs table
2. Create a new row with:
   - `title`: "Test Service - 2026"
   - `category`: Any existing category
   - `province`: A valid province
   - `status`: "Open" (NOT "Closed" or "Awarded")
   - `deadline`: Set to a future date (30+ days from now)
   - `estimated_budget`: Any amount (e.g., 250000)
   - `is_external_opportunity`: false

3. Note the RFQ ID

4. Create a match in `supplier_rfq_matches` table:
   - `supplier_id`: Your test supplier ID
   - `rfq_id`: The RFQ ID you just created
   - `match_score`: 80
   - `match_level`: "Strong Match"

## Testing Scenarios

### Scenario 1: Supplier with Matched RFQs
1. Log in as a supplier with matched RFQs
2. Go to Dashboard → Thuso hero section
3. Should see "Launch Thuso" button (not "No active RFQs matched yet")
4. Click button → Opens workspace with the matched RFQ
5. Ask Thuso: "Is there an RFQ matched to my profile?"
6. **Expected**: Thuso should reference the current active RFQ (2026), not old 2023 data

### Scenario 2: Supplier Without Matches
1. Use a supplier account with no matches
2. Go to Dashboard → Thuso hero section
3. Should see "No active RFQs matched yet" message
4. With helpful link to "browse available opportunities"
5. Ask Thuso: "How do I prepare for an RFQ?"
6. **Expected**: Thuso should provide general procurement guidance (not reference specific old RFQs)

### Scenario 3: RFQ Response Workspace
1. With matched RFQs, navigate to a specific RFQ
2. Open Thuso workspace
3. Ask: "Tell me about this RFQ"
4. **Expected**: Thuso references the current RFQ details with valid dates/budget

## Debugging Checklist

If Thuso still references old data:

1. ✅ Check the RFQ status in database:
   ```sql
   SELECT id, title, status, closing_date FROM rfqs 
   WHERE status != 'Open' AND status != 'Closing Soon';
   ```

2. ✅ Verify closing_date is in the future:
   ```sql
   SELECT id, title, closing_date FROM rfqs 
   WHERE closing_date < NOW();
   ```

3. ✅ Check browser console for errors when loading workspace

4. ✅ Verify the rfqContext is being passed correctly:
   - Open DevTools → Network
   - Look for calls to `/api/thuso/chat`
   - Check the `rfqContext` being sent

## Files Modified

- `src/lib/rfqContextProvider.ts` - Added active RFQ filtering and date validation
- `src/app/api/thuso/chat/route.ts` - Improved system prompts for discovery scenarios
- `scripts/create-test-rfq.sql` - Test data creation script
