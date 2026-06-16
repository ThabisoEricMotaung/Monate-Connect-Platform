"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ProfileImage } from "@/components/ProfileImage"
import { roleHomeHref } from "@/lib/navigation"
import { supabase } from "@/lib/supabase"

export type AccountMenuProfile = {
  business_name?: string | null
  email?: string | null
  full_name?: string | null
  preferred_name?: string | null
  role?: string | null
  avatar_url?: string | null
}

function displayName(profile: AccountMenuProfile | null): string {
  return (
    profile?.preferred_name?.trim() ||
    profile?.full_name?.trim() ||
    profile?.business_name?.trim() ||
    profile?.email?.trim() ||
    "AiForm Procure user"
  )
}

function initialsFromProfile(profile: AccountMenuProfile | null): string {
  const source = displayName(profile) || profile?.email || "AiForm Procure user"
  const parts = source.split(/\s|@/).filter(Boolean)

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "M"
  )
}

export default function AccountMenu({
  profile,
  businessProfileHref = "/dashboard/profile",
}: {
  profile: AccountMenuProfile | null
  businessProfileHref?: string
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const name = displayName(profile)
  const email = profile?.email?.trim() || "No email on profile"
  const initials = useMemo(() => initialsFromProfile(profile), [profile])
  const homeHref = roleHomeHref(profile?.role)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("pointerdown", handlePointerDown)
    return () => document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.assign("/?signedout=1")
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group flex cursor-pointer items-center gap-1.5 rounded-full border border-transparent bg-transparent p-1 pr-2 text-heading transition hover:border-accent/30 hover:bg-panel hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open account menu"
      >
        <ProfileImage
          src={profile?.avatar_url}
          alt={`${name} avatar`}
          className="h-10 w-10 rounded-full border border-panel object-cover shadow-sm transition group-hover:border-accent group-hover:brightness-105"
          fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border border-panel bg-panel text-sm font-bold shadow-sm transition group-hover:border-accent group-hover:brightness-105"
          fallbackText={initials}
          seedName={name}
        />
        <span
          aria-hidden="true"
          className={`text-xs leading-none text-secondary transition duration-200 group-hover:text-accent ${
            open ? "rotate-180" : "rotate-0"
          }`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-md border border-panel bg-card text-sm shadow-panel"
        >
          <div className="border-b border-panel px-4 py-3">
            <p className="truncate font-semibold text-heading">{name}</p>
            <p className="mt-0.5 truncate text-xs text-secondary">{email}</p>
          </div>
          <Link
            href={homeHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 font-semibold text-secondary transition hover:bg-panel hover:text-primary"
          >
            Home dashboard
          </Link>
          <Link
            href={businessProfileHref}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 font-semibold text-secondary transition hover:bg-panel hover:text-primary"
          >
            Business profile
          </Link>
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-3 font-semibold text-secondary transition hover:bg-panel hover:text-primary"
          >
            View public site
          </Link>
          <div className="border-t border-panel" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="block w-full px-4 py-3 text-left font-semibold text-rose-700 transition hover:bg-rose-500/10"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
