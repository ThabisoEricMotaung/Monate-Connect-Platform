import PublicHeader from "@/components/PublicHeader"
import PublicFooter from "@/components/PublicFooter"
import { ReactNode } from "react"

export default function PricingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      {children}
      <PublicFooter />
    </>
  )
}
