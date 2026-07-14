import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

// Public, no-login-required unsubscribe link clicked from the weekly
// supplier digest email. Identified by profile id (a UUID, effectively
// unguessable) rather than a session, since the person clicking it is
// reading an email, not signed in on this device.

function htmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:480px;margin:80px auto;padding:0 24px;color:#27332d;text-align:center;">
  <h1 style="font-size:20px;color:#1a3a2a;">${title}</h1>
  <p style="font-size:14px;line-height:1.7;">${message}</p>
  <p style="margin-top:24px;"><a href="/" style="color:#1a3a2a;font-weight:700;">Return to AiForm Procure</a></p>
</body>
</html>`
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.searchParams.get("id")?.trim()

  if (!id) {
    return new NextResponse(htmlPage("Missing link details", "This unsubscribe link is missing some information. Please use the link from the email directly."), {
      status: 400,
      headers: { "Content-Type": "text/html" },
    })
  }

  if (!supabaseAdmin) {
    return new NextResponse(htmlPage("Something went wrong", "We couldn't process this right now. Please try again shortly."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ weekly_digest_unsubscribed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("role", "supplier")

  if (error) {
    console.error("Weekly digest unsubscribe failed:", error)
    return new NextResponse(htmlPage("Something went wrong", "We couldn't process this right now. Please try again shortly."), {
      status: 500,
      headers: { "Content-Type": "text/html" },
    })
  }

  return new NextResponse(
    htmlPage(
      "You're unsubscribed",
      "You won't receive the weekly activity digest anymore. You'll still get emails about your own account, RFQs, and quotes.",
    ),
    { status: 200, headers: { "Content-Type": "text/html" } },
  )
}
