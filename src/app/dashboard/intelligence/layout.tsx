import AdminShell from "@/components/AdminShell"
import { ReactNode } from "react"

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  return <AdminShell>{children}</AdminShell>
}
