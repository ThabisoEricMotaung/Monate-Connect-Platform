export type DashboardStat = {
  title: string
  value: string
  color: string
}

export const dashboardStats: DashboardStat[] = [
  {
    title: "Verification Status",
    value: "Pending",
    color: "text-accent",
  },
  {
    title: "Active RFQs",
    value: "12",
    color: "text-heading",
  },
  {
    title: "Submitted Quotes",
    value: "4",
    color: "text-heading",
  },
]
