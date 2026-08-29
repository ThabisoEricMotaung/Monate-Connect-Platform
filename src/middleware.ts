import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // SEO: Redirect /opportunities/* to /tenders/* (canonical route consolidation)
  if (pathname.startsWith("/opportunities")) {
    const tenderPath = pathname.replace(/^\/opportunities/, "/tenders")
    return NextResponse.redirect(new URL(tenderPath + search, request.url), { status: 308 })
  }

  // Protected route patterns
  const isDashboard = pathname.startsWith("/dashboard")
  const isAdminApi = pathname.startsWith("/api/admin")

  if (!isDashboard && !isAdminApi) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from dashboard
  if (isDashboard && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  // Block unauthenticated requests to admin API
  if (isAdminApi && !user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 }
    )
  }

  return response
}

export const config = {
  matcher: ["/opportunities/:path*", "/dashboard/:path*", "/api/admin/:path*"],
}