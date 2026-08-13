import { afterEach, describe, expect, it, vi } from "vitest"

describe("buildBreadcrumbJsonLd", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("builds ordered breadcrumb names and absolute URLs", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test")
    const { buildBreadcrumbJsonLd } = await import("@/components/PublicBreadcrumbs")

    expect(
      buildBreadcrumbJsonLd([
        { label: "Home", href: "/" },
        { label: "Opportunities", href: "/opportunities" },
        { label: "Supply tender", href: "/opportunities/42" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://example.test/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Opportunities",
          item: "https://example.test/opportunities",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Supply tender",
          item: "https://example.test/opportunities/42",
        },
      ],
    })
  })
})
