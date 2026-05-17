export type DashboardStat = {
  title: string
  value: string
  color: string
}

export const dashboardStats: DashboardStat[] = [
  {
    title: "Verification Status",
    value: "Pending",
    color: "text-green-400",
  },
  {
    title: "Active RFQs",
    value: "12",
    color: "text-white",
  },
  {
    title: "Submitted Quotes",
    value: "4",
    color: "text-white",
  },
]
