import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// NOTE: @supabase/supabase-js v2 stores sessions in localStorage (browser-only).
// Reliable middleware auth requires @supabase/ssr which sets cookies accessible here.
// Until then: client-side guards in dashboard/layout.tsx and dashboard/page.tsx
// are the primary auth protection. This middleware handles what it can from cookies.

const PROTECTED_PREFIX = "/dashboard"
const AUTH_PATHS = ["/auth/login", "/auth/signup"]
const PUBLIC_AUTH_PATHS = ["/auth/callback", "/auth/verify-email"]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Try to read session from Supabase cookie (present when @supabase/ssr or
  // server-side rendering sets it; absent with pure localStorage client).
  const projectRef = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")
    .replace(/^https?:\/\//, "")
    .split(".")[0]

  const cookieKey = `sb-${projectRef}-auth-token`
  const sessionCookie =
    req.cookies.get(cookieKey) ?? req.cookies.get("sb-access-token")
  const hasSession = Boolean(sessionCookie?.value)

  if (AUTH_PATHS.includes(pathname) && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // For protected routes we only redirect when we are confident there is no session.
  // If the cookie is absent (localStorage-only client) we pass through and let the
  // client-side guard in dashboard/layout.tsx handle it.
  if (pathname.startsWith(PROTECTED_PREFIX) && req.cookies.size > 0 && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/login", "/auth/signup"],
}