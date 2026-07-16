// Email content for the public "open opportunities this week" digest — the
// no-account-required companion to buildDigestEmail() in weeklyDigest.ts.
// That one is personalised per registered supplier profile; this one has no
// profile to match against, so it just highlights a handful of opportunities
// closing soonest and links to the full feed.

import { emailSignatureHtml, emailSignatureText } from "./emailSignature"

export type DigestHighlight = {
  title: string
  province: string
  closingLabel: string
  url: string
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function buildPublicDigestEmail({
  newThisWeek,
  totalOpen,
  highlights,
  opportunitiesUrl,
  signupUrl,
  unsubscribeUrl,
  preview = false,
}: {
  newThisWeek: number
  totalOpen: number
  highlights: DigestHighlight[]
  opportunitiesUrl: string
  signupUrl: string
  unsubscribeUrl: string
  preview?: boolean
}) {
  const subjectBase =
    newThisWeek > 0
      ? `${newThisWeek} new ${newThisWeek === 1 ? "opportunity" : "opportunities"} this week on AiForm Procure`
      : `${totalOpen} open ${totalOpen === 1 ? "opportunity" : "opportunities"} on AiForm Procure right now`
  const subject = preview ? `[Preview] ${subjectBase}` : subjectBase

  const previewBanner = preview
    ? `<div style="max-width:560px;margin:0 auto;padding:10px 24px;background:#fff4e5;border-bottom:1px solid #f0d9b5;color:#8a5a00;font-size:12px;font-weight:700;text-align:center;">PREVIEW — generated from live platform data</div>`
    : ""

  const highlightRows = highlights
    .map(
      (h) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #ebebeb;">
            <a href="${h.url}" style="color:#1a3a2a;font-weight:700;font-size:14px;text-decoration:none;">${escapeHtml(h.title)}</a>
            <p style="margin:2px 0 0;font-size:12px;color:#6b7268;">${escapeHtml(h.province)} &middot; ${escapeHtml(h.closingLabel)}</p>
          </td>
        </tr>`
    )
    .join("")

  const highlightsHtml =
    highlights.length > 0
      ? `<table role="presentation" width="100%" style="border-collapse:collapse;margin:0 0 20px;">${highlightRows}</table>`
      : ""

  const highlightsText =
    highlights.length > 0
      ? `${highlights.map((h) => `- ${h.title} (${h.province}, ${h.closingLabel})\n  ${h.url}`).join("\n\n")}\n\n`
      : ""

  const html = `
    ${previewBanner}
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">Open opportunities this week</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        <strong>${newThisWeek}</strong> new ${newThisWeek === 1 ? "opportunity was" : "opportunities were"} added this week.
        There ${totalOpen === 1 ? "is" : "are"} <strong>${totalOpen}</strong> open ${totalOpen === 1 ? "opportunity" : "opportunities"} on the platform right now.
      </p>
      ${highlightsHtml}
      <p style="margin:0 0 24px;">
        <a href="${opportunitiesUrl}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Browse all open opportunities</a>
      </p>
      <p style="font-size:13px;line-height:1.7;margin:0 0 12px;color:#6b7268;">
        Want to submit quotes directly instead of just browsing? <a href="${signupUrl}" style="color:#1a3a2a;font-weight:700;">Create a free supplier account</a>.
      </p>
      ${emailSignatureHtml()}
      <p style="font-size:11px;line-height:1.6;margin:12px 0 0;color:#8a9089;">
        You're receiving this because you signed up for the weekly opportunities email on AiForm Procure.
        <a href="${unsubscribeUrl}" style="color:#8a9089;text-decoration:underline;">Unsubscribe</a>.
      </p>
    </div>
  `

  const text = `${preview ? "[PREVIEW — generated from live platform data]\n\n" : ""}Open opportunities this week

${newThisWeek} new ${newThisWeek === 1 ? "opportunity was" : "opportunities were"} added this week. ${totalOpen} open ${totalOpen === 1 ? "opportunity" : "opportunities"} on the platform right now.

${highlightsText}Browse all open opportunities: ${opportunitiesUrl}

Want to submit quotes directly instead of just browsing? Create a free supplier account: ${signupUrl}

${emailSignatureText()}

Unsubscribe: ${unsubscribeUrl}`

  return { subject, html, text }
}

export function buildSubscribeConfirmationEmail({ unsubscribeUrl }: { unsubscribeUrl: string }) {
  const subject = "You're subscribed — AiForm Procure weekly opportunities"
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">You're subscribed</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        You'll get a short email once a week with new and closing-soon procurement opportunities from AiForm Procure — no account needed.
      </p>
      ${emailSignatureHtml()}
      <p style="font-size:11px;line-height:1.6;margin:12px 0 0;color:#8a9089;">
        <a href="${unsubscribeUrl}" style="color:#8a9089;text-decoration:underline;">Unsubscribe</a> at any time.
      </p>
    </div>
  `
  const text = `You're subscribed

You'll get a short email once a week with new and closing-soon procurement opportunities from AiForm Procure — no account needed.

${emailSignatureText()}

Unsubscribe at any time: ${unsubscribeUrl}`

  return { subject, html, text }
}
