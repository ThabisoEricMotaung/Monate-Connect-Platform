// Shared logic for the weekly supplier activity digest — used by both the
// scheduled cron (src/app/api/cron/weekly-supplier-digest) and the
// admin-triggered preview (src/app/api/admin/weekly-digest-preview), so the
// email content an admin previews is guaranteed to match what actually
// gets sent.

export type DigestSupplierProfile = {
  id: string
  email: string | null
  first_name: string | null
  full_name: string | null
  preferred_name: string | null
  business_name: string | null
  industry: string | null
  province: string | null
  provinces: string[] | null
}

export type DigestOpenRfq = {
  id: number
  industry: string | null
  category: string | null
  province: string | null
  provinces: string[] | null
  created_at: string | null
}

export function siteUrl(): string {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.SITE_URL ||
    process.env.VERCEL_URL

  if (!configured) return "https://www.aiformprocure.co.za"
  return configured.startsWith("http") ? configured.replace(/\/$/, "") : `https://${configured.replace(/\/$/, "")}`
}

export function profileName(profile: DigestSupplierProfile): string {
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

function rfqIndustry(rfq: DigestOpenRfq): string {
  return normalize(rfq.industry || rfq.category)
}

export function countMatchingOpportunities(profile: DigestSupplierProfile, openRfqs: DigestOpenRfq[]): number {
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

export function buildDigestEmail({
  profile,
  matchCount,
  newThisWeek,
  totalOpen,
  profileIncomplete,
  opportunitiesUrl,
  profileUrl,
  unsubscribeUrl,
  preview = false,
}: {
  profile: DigestSupplierProfile
  matchCount: number
  newThisWeek: number
  totalOpen: number
  profileIncomplete: boolean
  opportunitiesUrl: string
  profileUrl: string
  unsubscribeUrl: string
  preview?: boolean
}) {
  const name = escapeHtml(profileName(profile))
  const subjectBase =
    matchCount > 0
      ? `${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"} your profile this week`
      : `${newThisWeek} new ${newThisWeek === 1 ? "opportunity" : "opportunities"} added this week on AiForm Procure`
  const subject = preview ? `[Preview] ${subjectBase}` : subjectBase

  const matchLine =
    matchCount > 0
      ? `Right now, <strong>${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"}</strong> your registered industry and province.`
      : profileIncomplete
        ? `We couldn't match any open opportunities to your profile this week because your industry or province isn't set yet — that's a quick fix and it's the main thing that determines what gets matched to you.`
        : `No opportunities matched your specific industry and province this week, but there are <strong>${totalOpen} open opportunities</strong> on the platform in total — worth a browse in case something adjacent fits.`

  const profileCta = profileIncomplete
    ? `<p style="margin:0 0 24px;"><a href="${profileUrl}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Complete your profile</a></p>`
    : ""

  const previewBanner = preview
    ? `<div style="max-width:560px;margin:0 auto;padding:10px 24px;background:#fff4e5;border-bottom:1px solid #f0d9b5;color:#8a5a00;font-size:12px;font-weight:700;text-align:center;">PREVIEW — this is what a supplier would see, generated from live platform data</div>`
    : ""

  const html = `
    ${previewBanner}
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

  const text = `${preview ? "[PREVIEW — generated from live platform data]\n\n" : ""}Hi ${profileName(profile)},

${newThisWeek} new ${newThisWeek === 1 ? "opportunity was" : "opportunities were"} added to the platform this week.
${matchCount > 0 ? `${matchCount} open ${matchCount === 1 ? "opportunity matches" : "opportunities match"} your registered industry and province.` : `No opportunities matched your specific profile this week (${totalOpen} open in total) — ${profileIncomplete ? "your industry/province isn't set yet, which is likely why." : "worth a browse in case something adjacent fits."}`}

Browse open opportunities: ${opportunitiesUrl}
${profileIncomplete ? `Complete your profile: ${profileUrl}` : ""}

Warmly,
Thabiso and the AiForm Procure team

Unsubscribe from this weekly email: ${unsubscribeUrl}`

  return { subject, html, text }
}
