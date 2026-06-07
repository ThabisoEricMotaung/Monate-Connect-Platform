export type RFQDeadlineStatus = "Open" | "Closing Soon" | "Closed"

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export function getRFQDeadlineStatus(
  deadline: string | Date | null | undefined
): RFQDeadlineStatus {
  if (!deadline) return "Open"

  const deadlineDate =
    deadline instanceof Date ? deadline : new Date(deadline)

  if (Number.isNaN(deadlineDate.getTime())) return "Open"

  const today = startOfDay(new Date())
  const deadlineDay = startOfDay(deadlineDate)
  const daysUntilDeadline =
    (deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)

  if (daysUntilDeadline < 0) return "Closed"
  if (daysUntilDeadline <= 3) return "Closing Soon"

  return "Open"
}

export function getRFQDisplayStatus(
  storedStatus: string | null | undefined,
  deadline: string | Date | null | undefined
): string {
  if (storedStatus === "Awarded") return "Awarded"

  return getRFQDeadlineStatus(deadline)
}
