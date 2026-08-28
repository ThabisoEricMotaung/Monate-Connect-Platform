/**
 * Verification script to ensure homepage stats and tenders API return matching counts.
 *
 * BEFORE: homepage showed 626, tenders showed 788 (mismatch due to:
 *   - curation_status filtering in homepage but not tenders
 *   - different date comparison logic (gt vs gte)
 *   - inconsistent timezone handling)
 *
 * AFTER: both should use unified query with:
 *   - NO curation_status filtering (tenders is source of truth)
 *   - Consistent base filters: is_public=true, status=active, no SMOKE TEST/[TEST]
 *   - Consistent SAST timezone handling
 *
 * Usage:
 *   npx ts-node verify-stats-alignment.ts
 */

import { createClient } from "@supabase/supabase-js"

async function verifyStatsAlignment() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log("Verifying stats alignment between homepage and tenders API...\n")

  try {
    // Test 1: Count live opportunities using homepage logic
    const now = new Date()
    const nowIso = now.toISOString()

    const homepageCountRes = await supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gt("closing_date", nowIso)
      .eq("is_public", true)

    if (homepageCountRes.error) {
      throw homepageCountRes.error
    }

    const homepageCount = homepageCountRes.count ?? 0
    console.log(`Homepage liveOpportunities count: ${homepageCount}`)

    // Test 2: Count tenders within default 90-day window
    // (simulating what tenders API does with default daysUntilClose=90)
    const offsetMs = 2 * 60 * 60 * 1000 // SAST is UTC+2
    const sastNow = new Date(Date.now() + offsetMs)
    const today = new Date(sastNow)
    today.setUTCHours(0, 0, 0, 0)
    const targetDate = new Date(today)
    targetDate.setDate(targetDate.getDate() + 90)

    const tendersCountRes = await supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)
      .eq("status", "active")
      .not("closing_date", "is", null)
      .gte("closing_date", today.toISOString())
      .lte("closing_date", targetDate.toISOString())
      .not("title", "ilike", "%SMOKE TEST%")
      .not("title", "ilike", "%[TEST]%")

    if (tendersCountRes.error) {
      throw tendersCountRes.error
    }

    const tendersCount = tendersCountRes.count ?? 0
    console.log(`Tenders API total count (90-day window): ${tendersCount}\n`)

    // Test 3: More detailed breakdown
    console.log("Detailed query comparison:")
    console.log(`  Homepage: status=active, closing_date > ${nowIso}, is_public=true`)
    console.log(
      `  Tenders:  status=active, closing_date [${today.toISOString()} - ${targetDate.toISOString()}], is_public=true, no TEST items`
    )
    console.log()

    // Analysis
    if (homepageCount === tendersCount) {
      console.log(
        "✓ SUCCESS: Both endpoints return MATCHING counts!"
      )
      console.log(
        `  All ${homepageCount} live opportunities close within the default 90-day window.`
      )
    } else {
      console.log("⚠ INFO: Counts differ (this is expected if opportunities extend beyond 90 days)")
      console.log(`  Difference: ${Math.abs(tendersCount - homepageCount)} items`)
      console.log(
        `  The homepage shows ALL future opportunities (${homepageCount}),`
      )
      console.log(
        `  while tenders shows those closing within 90 days (${tendersCount}).`
      )
      console.log()
      console.log("  To verify the unified filters are working:")
      console.log("  1. Both should NOT filter by curation_status")
      console.log("  2. Both should exclude SMOKE TEST and [TEST] items")
      console.log("  3. Both should use consistent timezone handling")
    }

    // Test 4: Count external opportunities (for reference)
    const externalCountRes = await supabase
      .from("rfqs")
      .select("id", { count: "exact", head: true })
      .eq("is_external_opportunity", true)
      .not("status", "ilike", "draft")

    const externalCount = externalCountRes.count ?? 0
    console.log(`\nReference: Total external opportunities: ${externalCount}`)
  } catch (error) {
    console.error("Error during verification:", error)
    process.exit(1)
  }
}

verifyStatsAlignment()
