import AdminDashboardLayout from "@/app/dashboard/admin/layout"
import { ReactNode } from "react"

export default function IntelligenceLayout({ children }: { children: ReactNode }) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>
}
