// Email content for the public B-BBEE certificate expiry reminder — the
// lead-magnet companion described in the growth notes: compliance anxiety
// is a real, recurring reason for a non-user to hand over an email address.
// This is NOT a verification service — AiForm Procure doesn't check or
// validate the date someone enters, it just reminds them of the date they
// gave us. That distinction matters and should stay explicit in the copy.

import { emailSignatureHtml, emailSignatureText } from "./emailSignature"

function formatExpiryDate(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })
}

export function buildComplianceSubscribeConfirmationEmail({
  expiryDate,
  unsubscribeUrl,
}: {
  expiryDate: string
  unsubscribeUrl: string
}) {
  const formatted = formatExpiryDate(expiryDate)
  const subject = "You're set — B-BBEE expiry reminder confirmed"
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">You're set</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        We'll email you 30 days before <strong>${formatted}</strong> so your B-BBEE certificate doesn't lapse without you noticing.
      </p>
      <p style="font-size:13px;line-height:1.7;margin:0 0 16px;color:#6b7268;">
        This is just a reminder based on the date you gave us — we don't verify or check certificates ourselves. If the date changes, come back and resubmit the form with the new date.
      </p>
      ${emailSignatureHtml()}
      <p style="font-size:11px;line-height:1.6;margin:12px 0 0;color:#8a9089;">
        <a href="${unsubscribeUrl}" style="color:#8a9089;text-decoration:underline;">Unsubscribe</a> at any time.
      </p>
    </div>
  `
  const text = `You're set

We'll email you 30 days before ${formatted} so your B-BBEE certificate doesn't lapse without you noticing.

This is just a reminder based on the date you gave us — we don't verify or check certificates ourselves. If the date changes, come back and resubmit the form with the new date.

${emailSignatureText()}

Unsubscribe at any time: ${unsubscribeUrl}`

  return { subject, html, text }
}

export function buildComplianceReminderEmail({
  expiryDate,
  daysLeft,
  signupUrl,
  unsubscribeUrl,
  preview = false,
}: {
  expiryDate: string
  daysLeft: number
  signupUrl: string
  unsubscribeUrl: string
  preview?: boolean
}) {
  const formatted = formatExpiryDate(expiryDate)
  const subjectBase = `Your B-BBEE certificate expires in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`
  const subject = preview ? `[Preview] ${subjectBase}` : subjectBase

  const previewBanner = preview
    ? `<div style="max-width:560px;margin:0 auto;padding:10px 24px;background:#fff4e5;border-bottom:1px solid #f0d9b5;color:#8a5a00;font-size:12px;font-weight:700;text-align:center;">PREVIEW — this is what a subscriber would see</div>`
    : ""

  const html = `
    ${previewBanner}
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#27332d;">
      <h2 style="font-size:21px;line-height:1.3;margin:0 0 14px;color:#1a3a2a;">Your B-BBEE certificate is expiring soon</h2>
      <p style="font-size:14px;line-height:1.7;margin:0 0 16px;">
        You told us your certificate expires on <strong>${formatted}</strong> — that's ${daysLeft} ${daysLeft === 1 ? "day" : "days"} away.
        Renewing in time keeps you eligible for tenders and RFQs that carry a B-BBEE requirement.
      </p>
      <p style="font-size:14px;line-height:1.7;margin:0 0 24px;">
        Once you've renewed, come back and register on AiForm Procure so verified buyers can find you directly.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${signupUrl}" style="display:inline-block;background:#1a3a2a;color:#ffffff;text-decoration:none;border-radius:8px;padding:12px 18px;font-size:14px;font-weight:700;">Create a free supplier account</a>
      </p>
      ${emailSignatureHtml()}
      <p style="font-size:11px;line-height:1.6;margin:12px 0 0;color:#8a9089;">
        You're receiving this because you asked AiForm Procure to remind you before this certificate expires.
        <a href="${unsubscribeUrl}" style="color:#8a9089;text-decoration:underline;">Unsubscribe</a>.
      </p>
    </div>
  `

  const text = `${preview ? "[PREVIEW]\n\n" : ""}Your B-BBEE certificate is expiring soon

You told us your certificate expires on ${formatted} — that's ${daysLeft} ${daysLeft === 1 ? "day" : "days"} away. Renewing in time keeps you eligible for tenders and RFQs that carry a B-BBEE requirement.

Once you've renewed, come back and register on AiForm Procure so verified buyers can find you directly: ${signupUrl}

${emailSignatureText()}

Unsubscribe: ${unsubscribeUrl}`

  return { subject, html, text }
}
