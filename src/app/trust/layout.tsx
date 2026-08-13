import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About AiForm Procure | South Africa's Trusted Procurement Platform",
  description: "Learn about AiForm Procure: how we verify suppliers, calculate SmartScore, protect buyer & supplier data, and connect government procurement opportunities.",
  openGraph: {
    title: "About AiForm Procure",
    description: "Discover how AiForm Procure connects verified suppliers with procurement opportunities.",
  },
}

export default function TrustLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
