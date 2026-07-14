import { NextResponse } from "next/server"
import { Resend } from "resend"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import {
  buildDigestEmail,
  countMatchingOpportunities,
  siteUrl,
  type DigestOpenRfq,
  type DigestSupplierProfile,
} from "@/lib/weeklyDigest"

// Lets a logged-in admin/buyer send themselves a live preview of the weekly
// supplier digest — same content-building code as the real cron, computed
// from real current platform data, so what they see is exactly what
// suppliers get. Visit this URL directly in the browser while logged in.
//
// Optional ?as=<supplier-profile-id> previews using a real supplier's
// industry/province, so you can see the "matched" branch of the email too,
// not just whatever your own admin profile looks like.

const DAY_MS = 24 * 60 * 60 * 1000
const LOOKBACK_MS = 7 * DAY_MS
const FETCH_PAGE_SIZE = 1000

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#27332d;text-align:center;">
  <h1 style="font-size:20px;color:#1a3a2a;">${title}</h1>
  <p style="font-size:14px;line-height:1.7;">${message}</p>
</body>
</html>`
}

export async function GET(request: Request) {
  if (!supabaseAdmin) {
    return new NextResponse(htmlPage("Not configured", "Supabase service role client is not configured."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return new NextResponse(htmlPage("Not configured", "Resend is not configured."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return new NextResponse(htmlPage("Sign in required", "Log in to the dashboard first, then reload this link."), {
      status: 401,
      headers: { "Content-Type": "text/html" },
    })
  }

  const { data: actorProfile, error: actorProfileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, email, first_name, full_name, preferred_name, business_name, industry, province, provinces")
    .eq("id", user.id)
    .maybeSingle()

  if (actorProfileError) {
    return new NextResponse(htmlPage("Something went wrong", actorProfileError.message), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  const role = String(actorProfile?.role ?? "").trim().toLowerCase()
  if (role !== "admin" && role !== "buyer") {
    return new NextResponse(htmlPage("Not allowed", "Admin or buyer access required to preview this email."), {
      status: 403,
      headers: { "Content-Type": "text/html" },
    })
  }

  if (!actorProfile?.email) {
    return new NextResponse(htmlPage("No email on file", "Your account doesn't have an email address to send the preview to."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  // Optionally preview using a real supplier's matching profile instead of
  // your own, so you can see the "opportunities matched" branch too.
  const asSupplierId = new URL(request.url).searchParams.get("as")?.trim()
  let matchProfile: DigestSupplierProfile = actorProfile as DigestSupplierProfile

  if (asSupplierId) {
    const { data: supplierProfile, error: supplierError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, first_name, full_name, preferred_name, business_name, industry, province, provinces")
      .eq("id", asSupplierId)
      .eq("role", "supplier")
      .maybeSingle()

    if (supplierError || !supplierProfile) {
      return new NextResponse(
        htmlPage("Supplier not found", "Couldn't find a supplier profile with that id — check the ?as= value."),
        { status: 404, headers: { "Content-Type": "text/html" } },
      )
    }

    matchProfile = supplierProfile as DigestSupplierProfile
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - LOOKBACK_MS)
  const base = siteUrl()
  const opportunitiesUrl = `${base}/opportunities`
  const profileUrl = `${base}/dashboard/profile`

  const openRfqs: DigestOpenRfq[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("rfqs")
        .select("id, industry, category, province, provinces, created_at")
        .ilike("status", "open")
        .eq("is_public", true)
        .gt("closing_date", now.toISOString())
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        return new NextResponse(htmlPage("Something went wrong", error.message), {
          status: 500,
          headers: { "Content-Type": "text/html" },
        })
      }

      const rows = (data ?? []) as DigestOpenRfq[]
      openRfqs.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE) break
      from += FETCH_PAGE_SIZE
    }
  }

  const totalOpen = openRfqs.length
  const newThisWeek = openRfqs.filter((rfq) => {
    if (!rfq.created_at) return false
    const created = new Date(rfq.created_at)
    return !Number.isNaN(created.getTime()) && created.getTime() >= weekAgo.getTime()
  }).length

  const matchCount = countMatchingOpportunities(matchProfile, openRfqs)
  const profileIncomplete = !matchProfile.industry?.trim() || !matchProfile.province?.trim()
  const unsubscribeUrl = `${base}/api/unsubscribe/weekly-digest?id=${matchProfile.id}`

  const { subject, html, text } = buildDigestEmail({
    profile: matchProfile,
    matchCount,
    newThisWeek,
    totalOpen,
    profileIncomplete,
    opportunitiesUrl,
    profileUrl,
    unsubscribeUrl,
    preview: true,
  })

  const resend = new Resend(resendApiKey)
  const sendResponse = await resend.emails.send({
    from: "AiForm Procure <noreply@aiformprocure.co.za>",
    to: actorProfile.email,
    subject,
    html,
    text,
  })

  if (sendResponse.error) {
    return new NextResponse(htmlPage("Send failed", sendResponse.error.message), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  return new NextResponse(
    htmlPage(
      "Preview sent",
      `Sent to ${actorProfile.email}${asSupplierId ? " (previewing as that supplier's matching profile)" : " (using your own profile)"}. Computed from live data: ${newThisWeek} new this week, ${totalOpen} open in total, ${matchCount} matched.`,
    ),
    { status: 200, headers: { "Content-Type": "text/html" } },
  )
}
