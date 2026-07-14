import { NextResponse } from "next/server"
import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// Weekly email to every subscribed supplier: how much activity happened on
// the platform this week, how many currently-open opportunities match their
// profile right now, and — if their profile is incomplete or they had zero
// matches — a nudge to fill in industry/province so future opportunities can
// actually reach them. Runs Monday mornings (see vercel.json).

type SupplierProfile = {
  id: string
  email: string | null
  first_name: string | null
  full_name: string | null
  preferred_name: string | null
  business_name: string | null
  industry: string | null
  province: string | null
  provinces: string[] | null
  weekly_digest_unsubscribed_at: string | null
}

type OpenRfq = {
  id: number
  industry: string | null
  category: string | null
  province: string | null
  provinces: string[] | null
  created_at: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
const LOOKBACK_MS = 7 * DAY_MS
const MAX_PROFILES_PER_RUN = 2000
const FETCH_PAGE_SIZE = 1000

function cronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const authHeader = request.headers.get("authorization")
  const cronHeader = request.headers.get("x-cron-secret")

  return authHeader === `Bearer ${secret}` || cronHeader === secret
}

function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL

  if (!configured) return "https://www.aiformprocure.co.za"
  return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`
}

function profileName(profile: SupplierProfile): string {
  return (
    profile.preferred_name?.trim() ||
    profile.first_name?.trim() ||
    profile.full_name?.trim()?.split(/\s+/)[0] ||
    profile.business_name?.trim() ||
    "there"
  )
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

function normalizeArray(value: string[] | null | undefined): string[] {
  return Array.isArray(value) ? value.filter(Boolean) : []
}

function normalizedProvinceSet(
  province: string | null | undefined,
  provinces: string[] | null | undefined,
): Set<string> {
  const values = normalizeArray(provinces)
  if (province) values.push(province)

  return new Set(
    values.map(normalize).map((value) =>
      value === "south africa" || value === "all provinces" ? "national" : value,
    ),
  )
}

function rfqIndustry(rfq: OpenRfq): string {
  return normalize(rfq.industry || rfq.category)
}

function countMatchingOpportunities(profile: SupplierProfile, openRfqs: OpenRfq[]): number {
  const supplierIndustry = normalize(profile.industry)
  if (!supplierIndustry) return 0

  const supplierProvinces = normalizedProvinceSet(profile.province, profile.provinces)

  return openRfqs.filter((rfq) => {
    if (rfqIndustry(rfq) !== supplierIndustry) return false
    const rfqProvinces = normalizedProvinceSet(rfq.province, rfq.provinces)
    if (rfqProvinces.size === 0) return true
    return Array.from(supplierProvinces).some((province) => rfqProvinces.has(province))
  }).length
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function buildEmail({
  profile,
  matchCount,
  newThisWeek,
  totalOpen,
  profileIncomplete,
  opportunitiesUrl,
  profileUrl,
  unsubscribeUrl,
}: {
  profile: SupplierProfile
  matchCount: number
  newThisWeek: number
  totalOpen: number
  profileIncomplete: boolean
  opportunitiesUrl: string
  profileUrl: string
  unsubscribeUrl: string
}) {
  const name = escapeHtml(profileName(profile))
  const subject =
    matchCount > 0
      ? `${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"} your profile this week`
      : `${newThisWeek} new ${newThisWeek === 1 ? "opportunity" : "opportunities"} added this week on AiForm Procure`

  const matchLine =
    matchCount > 0
      ? `Right now, <strong>${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"}</strong> your registered industry and province.`
      : profileIncomplete
        ? `We couldn't match any open opportunities to your profile this week because your industry or province isn't set yet — that's a quick fix and it's the main thing that determines what gets matched to you.`
        : `No opportunities matched your specific industry and province this week, but there are <strong>${totalOpen} open opportunities</strong> on the platform in total — worth a browse in case something adjacent fits.`

  const profileCta = profileIncomplete
    ? `<p style="margin:0 0 24px;"><a href="${profileUrl}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Complete your profile</a></p>`
    : ""

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">This week on AiForm Procure</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">Hi ${name},</p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        <strong>${newThisWeek}</strong> new ${newThisWeek === 1 ? "opportunity was" : "opportunities were"} added to the platform this week.
        ${matchLine}
      </p>
      <p style="margin:0 0 24px;">
        <a href="${opportunitiesUrl}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Browse open opportunities</a>
      </p>
      ${profileCta}
      <p style="font-size:14px;line-height:1.7;margin:0 0 12px;">
        The more complete your profile (industry, province, BBBEE level, documents), the more precisely we can tell you when something fits.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 24px;">Warmly,<br />Thabiso and the AiForm Procure team</p>
      <p style="font-size:11px;line-height:1.6;margin:0;color:#8a9089;">
        You're receiving this because you're a registered supplier on AiForm Procure.
        <a href="${unsubscribeUrl}" style="color:#8a9089;text-decoration:underline;">Unsubscribe from this weekly email</a>.
      </p>
    </div>
  `

  const text = `Hi ${profileName(profile)},

${newThisWeek} new ${newThisWeek === 1 ? "opportunity was" : "opportunities were"} added to the platform this week.
${matchCount > 0 ? `${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"} your registered industry and province.` : `No opportunities matched your specific profile this week (${totalOpen} open in total) — ${profileIncomplete ? "your industry/province isn't set yet, which is likely why." : "worth a browse in case something adjacent fits."}`}

Browse open opportunities: ${opportunitiesUrl}
${profileIncomplete ? `Complete your profile: ${profileUrl}` : ""}

Warmly,
Thabiso and the AiForm Procure team

Unsubscribe from this weekly email: ${unsubscribeUrl}`

  return { subject, html, text }
}

export async function GET(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 })
  }

  if (!supabaseAdmin) {
    return NextResponse.json({ ok: false, error: "Supabase service role client is not configured." }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json({ ok: false, error: "Resend is not configured." }, { status: 500 })
  }

  const now = new Date()
  const weekAgo = new Date(now.getTime() - LOOKBACK_MS)
  const base = siteUrl()
  const opportunitiesUrl = `${base}/opportunities`
  const profileUrl = `${base}/dashboard/profile`

  // Every currently-open, public opportunity — used both for the "N new
  // this week" / "N open in total" counts and for per-supplier matching.
  const openRfqs: OpenRfq[] = []
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
        console.error("Weekly digest rfqs query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as OpenRfq[]
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

  // Subscribed suppliers with an email on file.
  const suppliers: SupplierProfile[] = []
  {
    let from = 0
    while (true) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select(
          "id, email, first_name, full_name, preferred_name, business_name, industry, province, provinces, weekly_digest_unsubscribed_at",
        )
        .eq("role", "supplier")
        .not("email", "is", null)
        .is("weekly_digest_unsubscribed_at", null)
        .range(from, from + FETCH_PAGE_SIZE - 1)

      if (error) {
        console.error("Weekly digest profiles query failed:", error)
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
      }

      const rows = (data ?? []) as SupplierProfile[]
      suppliers.push(...rows)
      if (rows.length < FETCH_PAGE_SIZE || suppliers.length >= MAX_PROFILES_PER_RUN) break
      from += FETCH_PAGE_SIZE
    }
  }

  if (suppliers.length === 0) {
    console.log("Weekly supplier digest run", { checked: 0, sent: 0, skippedAlreadySent: 0, errors: 0 })
    return NextResponse.json({ ok: true, checked: 0, sent: 0, skippedAlreadySent: 0, errors: 0, newThisWeek, totalOpen })
  }

  // Idempotency: skip anyone already sent a "Weekly Digest" in the last 6
  // days, in case this run is retried manually the same week.
  const idempotencyCutoff = new Date(now.getTime() - 6 * DAY_MS).toISOString()
  const supplierIds = suppliers.map((supplier) => supplier.id)
  const { data: recentSendsData, error: recentSendsError } = await supabaseAdmin
    .from("email_alerts")
    .select("supplier_id")
    .eq("alert_type", "Weekly Digest")
    .eq("status", "sent")
    .gte("sent_at", idempotencyCutoff)
    .in("supplier_id", supplierIds)

  if (recentSendsError) {
    console.error("Weekly digest idempotency query failed:", recentSendsError)
    return NextResponse.json({ ok: false, error: recentSendsError.message }, { status: 500 })
  }

  const alreadySent = new Set((recentSendsData ?? []).map((row) => row.supplier_id as string))

  const resend = new Resend(resendApiKey)
  let sent = 0
  let skippedAlreadySent = 0
  let errors = 0
  const failureDetails: string[] = []

  for (const supplier of suppliers) {
    if (alreadySent.has(supplier.id)) {
      skippedAlreadySent += 1
      continue
    }

    const matchCount = countMatchingOpportunities(supplier, openRfqs)
    const profileIncomplete = !supplier.industry?.trim() || !supplier.province?.trim()
    const unsubscribeUrl = `${base}/api/unsubscribe/weekly-digest?id=${supplier.id}`

    const { subject, html, text } = buildEmail({
      profile: supplier,
      matchCount,
      newThisWeek,
      totalOpen,
      profileIncomplete,
      opportunitiesUrl,
      profileUrl,
      unsubscribeUrl,
    })

    try {
      const sendResponse = await resend.emails.send({
        from: "AiForm Procure <noreply@aiformprocure.co.za>",
        to: supplier.email!,
        subject,
        html,
        text,
      })

      if (sendResponse.error) throw new Error(sendResponse.error.message)

      sent += 1
      await supabaseAdmin.from("email_alerts").insert([
        {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name ?? profileName(supplier),
          supplier_email: supplier.email,
          alert_type: "Weekly Digest",
          subject,
          message: text,
          status: "sent",
          sent_at: now.toISOString(),
          metadata: { match_count: matchCount, new_this_week: newThisWeek, total_open: totalOpen, resend_id: sendResponse.data?.id ?? null },
        },
      ])
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : "Unknown email send failure"
      failureDetails.push(`${supplier.business_name ?? profileName(supplier)} (${supplier.email}): ${message}`)
      console.error("Weekly digest email failed:", { profileId: supplier.id, error: message })
      await supabaseAdmin.from("email_alerts").insert([
        {
          supplier_id: supplier.id,
          supplier_name: supplier.business_name ?? profileName(supplier),
          supplier_email: supplier.email,
          alert_type: "Weekly Digest",
          subject,
          message: text,
          status: "failed",
          metadata: { match_count: matchCount, new_this_week: newThisWeek, total_open: totalOpen, error: message },
        },
      ])
    }
  }

  const summary = {
    checked: suppliers.length,
    sent,
    skippedAlreadySent,
    errors,
    newThisWeek,
    totalOpen,
  }
  console.log("Weekly supplier digest run", summary)

  // One internal summary email per run — not a copy of every supplier
  // email, just the run totals, so this doesn't flood the inbox.
  try {
    const summaryLines = [
      `Suppliers checked: ${summary.checked}`,
      `Sent: ${summary.sent}`,
      `Skipped (already sent this week): ${summary.skippedAlreadySent}`,
      `Failed: ${summary.errors}`,
      `New opportunities this week: ${summary.newThisWeek}`,
      `Total open opportunities: ${summary.totalOpen}`,
    ]
    const failuresBlock =
      failureDetails.length > 0 ? `\n\nFailures:\n${failureDetails.map((line) => `- ${line}`).join("\n")}` : ""

    await resend.emails.send({
      from: "AiForm Procure <noreply@aiformprocure.co.za>",
      to: "aiformstudio@gmail.com",
      subject: `Weekly supplier digest run: ${summary.sent} sent, ${summary.errors} failed`,
      text: `Weekly supplier digest run summary\n\n${summaryLines.join("\n")}${failuresBlock}`,
    })
  } catch (error) {
    console.error("Weekly digest internal summary email failed:", error)
  }

  return NextResponse.json({ ok: errors === 0, ...summary })
}
