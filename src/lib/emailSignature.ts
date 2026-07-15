// Shared signature/footer block for every outbound system email, so the
// branding is consistent no matter which route sent it (previously each
// route had its own one-line, inconsistent sign-off, and some had none).
//
// Also the single place that defines who gets an automatic real copy of
// every supplier-facing email that goes out, so it can be reviewed.

export const SUPPORT_EMAIL = "support@aiformprocure.co.za"
export const MARKETING_SITE_URL = "https://www.aiformprocure.co.za"

// Thabiso wants to see exactly what suppliers receive from every
// supplier-facing send (weekly digest, document reminders, one-off
// announcements, RFQ match alerts) — not just a stats summary — so he can
// review and adjust copy if needed. Each of those routes sends one real,
// unmodified copy of the first email in a given run to this address.
export const SUPPLIER_EMAIL_REVIEW_RECIPIENT = "thabiso.motaung@up.ac.za"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function emailSignatureHtml(): string {
  return `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #ebebeb;">
      <p style="font-size:14px;line-height:1.6;margin:0 0 10px;color:#1a3a2a;">Warmly,<br /><strong>The AiForm Procure Team</strong></p>
      <p style="font-size:12px;line-height:1.7;margin:0;color:#8a9089;">
        AiForm Procure &middot; South Africa's B2B procurement &amp; RFQ platform<br />
        <a href="${MARKETING_SITE_URL}" style="color:#8a9089;text-decoration:underline;">aiformprocure.co.za</a>
        &middot;
        <a href="mailto:${SUPPORT_EMAIL}" style="color:#8a9089;text-decoration:underline;">${SUPPORT_EMAIL}</a>
      </p>
    </div>
  `
}

export function emailSignatureText(): string {
  return `Warmly,\nThe AiForm Procure Team\n\nAiForm Procure -- South Africa's B2B procurement & RFQ platform\n${MARKETING_SITE_URL} | ${SUPPORT_EMAIL}`
}

// Wraps a real rendered email (subject/html/text) as a labeled internal
// review copy, so it's obviously not a duplicate send to the same
// supplier and is clear at a glance whose email it's a copy of.
export function reviewCopyEmail({
  subject,
  html,
  text,
  sourceLabel,
  runLabel,
}: {
  subject: string
  html: string
  text: string
  sourceLabel: string
  runLabel: string
}): { subject: string; html: string; text: string } {
  const noticeHtml = `<div style="max-width:560px;margin:0 auto 12px;padding:10px 24px;background:#eef5f0;border-left:3px solid #1a3a2a;color:#1a3a2a;font-size:12px;">This is an unmodified copy of the ${escapeHtml(runLabel)} email actually sent to a real supplier (${escapeHtml(sourceLabel)}), so you can review what went out.</div>`
  const noticeText = `[Unmodified copy of the ${runLabel} email sent to a real supplier: ${sourceLabel}]\n\n`

  return {
    subject: `[Copy] ${subject}`,
    html: `${noticeHtml}${html}`,
    text: `${noticeText}${text}`,
  }
}
