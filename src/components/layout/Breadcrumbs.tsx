"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const labelMap: Record<string, string> = {
  dashboard: "Dashboard",
  rfqs: "RFQs",
  quotes: "Quotes",
  profile: "Supplier Profile",
  verification: "Verification",
}

export default function Breadcrumbs() {
  const pathname = usePathname() || "/"
  const segments = pathname
    .split("/")
    .filter(Boolean)

  if (segments.length === 0) {
    return null
  }

  const items = segments.map((segment, index) => {
    const path = `/${segments.slice(0, index + 1).join("/")}`
    const isLast = index === segments.length - 1
    let label = labelMap[segment] || segment

    if (segment.match(/^\d+$/) && segments[index - 1] === "rfqs") {
      label = `RFQ #${segment}`
    }

    if (segment === "dashboard" && index === 0) {
      label = "Dashboard"
    }

    return {
      label,
      path,
      isLast,
    }
  })

  return (
    <div className="mb-6 rounded-2xl border border-panel bg-surface p-4 text-sm text-secondary shadow-sm">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
        <Link href="/" className="text-accent transition-colors hover:text-accent-strong">
          Home
        </Link>
        <span className="text-secondary">/</span>
        {items.map((item, index) => (
          <span key={`${item.path}-${index}`} className="inline-flex items-center gap-2">
            {!item.isLast ? (
              <>
                <Link href={item.path} className="text-secondary transition-colors hover:text-primary">
                  {item.label}
                </Link>
                <span className="text-secondary">/</span>
              </>
            ) : (
              <span className="font-semibold text-primary">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}
