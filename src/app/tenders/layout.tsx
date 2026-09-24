import type { Metadata } from 'next'

const SITE_URL = 'https://www.aiformprocure.co.za'

export const metadata: Metadata = {
  title: 'Live Government Tenders & RFQs - AiForm Procure',
  description: 'Search 1,400+ live government tenders, RFQs and procurement opportunities across South Africa. Filter by province, budget, category and source. Updated daily.',
  alternates: {
    canonical: `${SITE_URL}/tenders`,
  },
  openGraph: {
    title: 'Government Tenders & RFQs',
    description: 'Search live procurement opportunities across South Africa',
    url: `${SITE_URL}/tenders`,
    siteName: 'AiForm Procure',
    type: 'website',
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: 'AiForm Procure - Government Tenders',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
}

export default function TendersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
