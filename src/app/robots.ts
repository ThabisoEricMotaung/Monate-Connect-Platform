import type { MetadataRoute } from "next"

const SITE_URL = "https://www.aiformprocure.co.za"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/auth", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
