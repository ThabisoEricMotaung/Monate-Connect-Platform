import AdminDashboardLayout from "@/app/dashboard/admin/layout"
import { ReactNode } from "react"

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <AdminDashboardLayout>{children}</AdminDashboardLayout>
}
