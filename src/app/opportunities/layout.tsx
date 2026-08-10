import type { Metadata } from "next"

const title = "Open Tenders & Procurement Opportunities in South Africa | AiForm Procure"
const description = "Browse live South African tenders and RFQs by industry, province, and closing date, with links to original public procurement listings."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/opportunities" },
  openGraph: {
    title,
    description,
    url: "/opportunities",
    siteName: "AiForm Procure",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AiForm Procure — live South African tenders and RFQs" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
}

export default function OpportunitiesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
