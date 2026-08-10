import { NextResponse } from "next/server"
import { createSupabaseServerClient } from "@/lib/supabase-server"
import {
  LOCALE_COOKIE_NAME,
  isAppLocale,
  normalizeLocale,
} from "@/i18n/config"

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function setLocaleCookie(response: NextResponse, locale: string) {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: true,
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ locale: null })
  }

  const { data, error } = await supabase
    .from("user_locale_preferences")
    .select("preferred_locale")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: "Locale preference failed to load." }, { status: 500 })
  }

  const locale = data ? normalizeLocale(data.preferred_locale) : null
  const response = NextResponse.json({ locale })
  if (locale) setLocaleCookie(response, locale)
  return response
}

export async function POST(request: Request) {
  let body: { locale?: unknown; persist?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 })
  }

  if (!isAppLocale(body.locale)) {
    return NextResponse.json({ error: "Unsupported locale." }, { status: 400 })
  }

  const locale = body.locale
  const shouldPersist = body.persist !== false
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user && shouldPersist) {
    const { error } = await supabase
      .from("user_locale_preferences")
      .upsert(
        {
          user_id: user.id,
          preferred_locale: locale,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )

    if (error) {
      return NextResponse.json({ error: "Locale preference failed to save." }, { status: 500 })
    }
  }

  const response = NextResponse.json({ locale, persisted: Boolean(user && shouldPersist) })
  setLocaleCookie(response, locale)
  return response
}
