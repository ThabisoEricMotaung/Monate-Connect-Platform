import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PROTECTED_PREFIX = "/dashboard"
const AUTH_PATHS = ["/auth/login", "/auth/signup"]
const PUBLIC_AUTH_PATHS = ["/auth/callback", "/auth/verify-email"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hostname = req.nextUrl.hostname.toLowerCase()

  if (hostname === "aiformprocure.co.za") {
    const canonicalUrl = req.nextUrl.clone()
    canonicalUrl.hostname = "www.aiformprocure.co.za"
    canonicalUrl.port = ""
    return NextResponse.redirect(canonicalUrl, 308)
  }

  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  if (PUBLIC_AUTH_PATHS.some((p) => pathname.startsWith(p))) {
    return response
  }

  const needsAuthMiddleware = pathname.startsWith(PROTECTED_PREFIX) || AUTH_PATHS.includes(pathname)
  if (!needsAuthMiddleware) return response

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (AUTH_PATHS.includes(pathname) && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role === "admin" || profile?.role === "buyer") {
      return NextResponse.redirect(new URL("/dashboard/admin", req.url))
    }

    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (pathname.startsWith(PROTECTED_PREFIX) && req.cookies.size > 0 && !user) {
    const url = req.nextUrl.clone()
    url.pathname = "/auth/login"
    url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
}
