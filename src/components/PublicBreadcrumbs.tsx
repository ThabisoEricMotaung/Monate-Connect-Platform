import Link from "next/link"

export type BreadcrumbItem = { label: string; href: string }

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://www.aiformprocure.co.za"

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  }
}

export default async function PublicBreadcrumbs({
  items,
}: {
  items: BreadcrumbItem[]
}) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-secondary">
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <li key={item.href} className="flex min-w-0 items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {index < items.length - 1 ? (
                <Link
                  href={item.href}
                  className="text-accent transition-colors hover:text-accent-strong hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate text-secondary">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildBreadcrumbJsonLd(items)).replace(/</g, "\\u003c"),
        }}
      />
    </>
  )
}
