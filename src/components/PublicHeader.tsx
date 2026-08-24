"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import BrandMark from "@/components/BrandMark"
import { useRegistrationStatus } from "@/hooks/useRegistrationStatus"
import { supabase } from "@/lib/supabase"

const NAV_LINKS = [
  { key: "about", href: "/about" }, { key: "opportunities", href: "/opportunities" },
  { key: "suppliers", href: "/suppliers" }, { key: "trustCentre", href: "/trust" },
  { key: "pricing", href: "/pricing" }, { key: "contact", href: "/contact" },
] as const

function isActiveLink(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function PublicHeader() {
  const t = useTranslations("publicChrome")
  const pathname = usePathname() || "/"
  const [signedOutNotice, setSignedOutNotice] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const registrationStatus = useRegistrationStatus()
  const isIncompleteRegistration = registrationStatus.state === "incomplete"
  const dashboardHref = registrationStatus.state === "complete" ? registrationStatus.dashboardHref : null
  const dashboardLabel = t("dashboard")
  const homeHref = dashboardHref ?? "/"

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    setSignedOutNotice(pathname === "/" && params.get("signedout") === "1")
  }, [pathname])

  async function handleLogout() {
    if (!supabase) {
      window.location.assign("/?signedout=1")
      return
    }
    await supabase.auth.signOut()
    window.location.assign("/?signedout=1")
  }

  async function handleIncompleteSignOut() {
    if (!supabase) {
      window.location.assign("/")
      return
    }
    await supabase.auth.signOut()
    window.location.assign("/")
  }

  return (
    <>
      {/* Trust Bar */}
      <div
        style={{
          background: "#1a3a2a",
          padding: "6px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "4px",
        }}
      >
        <span style={{ color: "#9FE1CB", fontSize: "11px", letterSpacing: "0.08em" }}>
          CSD · BBBEE · SARS · CIPC · NATIONAL TREASURY
        </span>
        <span style={{ color: "#9FE1CB", fontSize: "11px", letterSpacing: "0.08em" }}>
          {t("freePilot")}
        </span>
      </div>

      {/* Signed-out notice */}
      {signedOutNotice && (
        <div
          style={{
            background: "#f5f5f5",
            borderBottom: "1px solid #eeeeee",
            padding: "8px 24px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: 600,
            color: "#555555",
          }}
        >
          {t("signedOut")}
        </div>
      )}

      {/* Main Sticky Navbar */}
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #eeeeee",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            position: "relative",
            maxWidth: "1280px",
            margin: "0 auto",
            padding: "12px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link
            href={homeHref}
            aria-label={dashboardHref ? dashboardLabel : t("homepage")}
            style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <BrandMark className="h-10 w-10" imageClassName="h-6 w-auto" />
            <div>
              <p
                style={{
                  fontSize: "10px",
                  color: "#999999",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {t("procurementSuite")}
              </p>
              <p
                style={{
                  fontSize: "15px",
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  color: "#1a3a2a",
                  margin: 0,
                  lineHeight: 1.4,
                }}
              >
                AiForm Procure
              </p>
            </div>
          </Link>

          {/* Desktop Nav Links — plain text, no borders, no boxes */}
          <nav
            aria-label={t("publicNavigation")}
            className="hidden md:flex"
            style={{ alignItems: "center", gap: "2px" }}
          >
            {NAV_LINKS.map((link) => {
              const active = isActiveLink(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="public-nav-link"
                  style={{
                    fontSize: "13px",
                    color: active ? "#1a3a2a" : "#444444",
                    padding: "8px 14px",
                    textDecoration: "none",
                    borderRadius: "6px",
                    background: active ? "#f5f5f5" : "transparent",
                    transition: "color 150ms, background 150ms",
                    whiteSpace: "nowrap",
                    display: "inline-block",
                  }}
                >
                  {t(link.key)}
                </Link>
              )
            })}
            {isIncompleteRegistration && (
              <button
                type="button"
                onClick={handleIncompleteSignOut}
                className="text-sm hover:underline"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1a3a2a",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "8px 10px",
                }}
              >
                ← {t("startOver")}
              </button>
            )}
          </nav>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex" style={{ gap: "8px", alignItems: "center" }}>
            {isIncompleteRegistration ? null : dashboardHref ? (
              <>
                <Link
                  href={dashboardHref}
                  style={{
                    background: "#c8960c",
                    color: "#1a3a2a",
                    border: "none",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {dashboardLabel}
                </Link>
                {!isIncompleteRegistration && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      background: "transparent",
                      border: "1px solid #1a3a2a",
                      color: "#1a3a2a",
                      borderRadius: "6px",
                      padding: "8px 16px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {t("logout")}
                  </button>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  style={{
                    background: "transparent",
                    border: "1px solid #1a3a2a",
                    color: "#1a3a2a",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {t("login")}
                </Link>
                <Link
                  href="/auth/signup"
                  style={{
                    background: "#c8960c",
                    border: "none",
                    color: "#1a3a2a",
                    borderRadius: "6px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                  }}
                >
                  {t("registerFree")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger */}
          <button
            type="button"
            aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex md:hidden"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1a3a2a",
              padding: "4px 8px",
              fontSize: "20px",
              lineHeight: 1,
            }}
          >
            {menuOpen ? "×" : "☰"}
          </button>

          {/* Mobile Drawer */}
          {menuOpen && (
            <div
              className="md:hidden"
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                background: "#ffffff",
                borderBottom: "1px solid #eeeeee",
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                padding: "16px 24px",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                zIndex: 50,
              }}
            >
              {NAV_LINKS.map((link) => {
                const active = isActiveLink(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontSize: "14px",
                      color: active ? "#1a3a2a" : "#444444",
                      padding: "10px 14px",
                      textDecoration: "none",
                      borderRadius: "6px",
                      background: active ? "#f5f5f5" : "transparent",
                      display: "block",
                    }}
                  >
                    {t(link.key)}
                  </Link>
                )
              })}
              <div
                style={{
                  borderTop: "1px solid #eeeeee",
                  marginTop: "8px",
                  paddingTop: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {isIncompleteRegistration ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      handleIncompleteSignOut()
                    }}
                    className="text-sm hover:underline"
                    style={{
                      alignSelf: "center",
                      background: "transparent",
                      border: "none",
                      color: "#1a3a2a",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "6px 10px",
                    }}
                  >
                    ← {t("startOver")}
                  </button>
                ) : dashboardHref ? (
                  <>
                    <Link
                      href={dashboardHref}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        background: "#c8960c",
                        color: "#1a3a2a",
                        border: "none",
                        borderRadius: "6px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        textAlign: "center",
                        display: "block",
                      }}
                    >
                      {dashboardLabel}
                    </Link>
                    {!isIncompleteRegistration && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          handleLogout()
                        }}
                        style={{
                          background: "transparent",
                          border: "1px solid #1a3a2a",
                          color: "#1a3a2a",
                          borderRadius: "6px",
                          padding: "10px 16px",
                          fontSize: "13px",
                          cursor: "pointer",
                          textAlign: "center",
                          fontFamily: "inherit",
                          width: "100%",
                        }}
                      >
                        {t("logout")}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/login"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        background: "transparent",
                        border: "1px solid #1a3a2a",
                        color: "#1a3a2a",
                        borderRadius: "6px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        textDecoration: "none",
                        textAlign: "center",
                        display: "block",
                      }}
                    >
                      {t("login")}
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        background: "#c8960c",
                        border: "none",
                        color: "#1a3a2a",
                        borderRadius: "6px",
                        padding: "10px 16px",
                        fontSize: "13px",
                        fontWeight: 500,
                        textDecoration: "none",
                        textAlign: "center",
                        display: "block",
                      }}
                    >
                      {t("registerFree")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

