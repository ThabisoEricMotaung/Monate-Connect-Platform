"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { dashboardBreadcrumbs, dashboardParentHref } from "@/lib/navigation"

export default function Breadcrumbs({ role }: { role?: string | null }) {
  const pathname = usePathname() || "/"
  const items = dashboardBreadcrumbs(pathname, role)
  const parent = dashboardParentHref(pathname, role)

  if (items.length === 0) {
    return null
  }

  const current = items[items.length - 1]
  const showBack = Boolean(parent && items.length > 2 && current?.href !== parent.href)

  return (
    <div className="dashboard-breadcrumbs rounded-md border border-panel bg-surface p-4 text-sm text-secondary shadow-sm">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <span key={`${item.href}-${index}`} className="inline-flex items-center gap-2">
            {index < items.length - 1 ? (
              <>
                <Link
                  href={item.href}
                  className="cursor-pointer font-semibold text-accent transition-colors hover:text-accent-strong hover:underline hover:underline-offset-4"
                >
                  {item.label}
                </Link>
                <span className="text-muted">/</span>
              </>
            ) : (
              <span aria-current="page" className="font-semibold text-muted">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
      {showBack && parent && (
        <Link
          href={parent.href}
          className="mt-3 inline-flex cursor-pointer items-center text-xs font-bold uppercase tracking-[0.14em] text-accent transition hover:text-accent-strong hover:underline hover:underline-offset-4"
        >
          &larr; Back to {parent.label}
        </Link>
      )}
    </div>
  )
}
