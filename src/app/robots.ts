import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/admin',
          '/api',
          '/*.json$',
          '/auth',
          '/private',
        ],
      },
      {
        userAgent: 'AdsBot-Google',
        allow: ['/'],
      },
    ],
    sitemap: 'https://www.aiformprocure.co.za/sitemap.xml',
    host: 'https://www.aiformprocure.co.za',
  }
}
