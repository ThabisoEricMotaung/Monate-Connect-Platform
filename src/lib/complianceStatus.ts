export type ComplianceStatusLevel = "expired" | "expiring_soon" | "valid" | "unknown"

export interface ComplianceStatus {
  status: ComplianceStatusLevel
  label: string
  daysUntilExpiry: number | null
  badgeClass: string
}

export function getComplianceStatus(expiryDate: string | null | undefined): ComplianceStatus {
  if (!expiryDate) {
    return {
      status: "unknown",
      label: "No expiry set",
      daysUntilExpiry: null,
      badgeClass: "border-panel bg-panel text-secondary",
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const daysUntilExpiry = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysUntilExpiry < 0) {
    return {
      status: "expired",
      label: "Expired",
      daysUntilExpiry,
      badgeClass: "border-rose-500/30 bg-rose-500/10 text-rose-700",
    }
  }

  if (daysUntilExpiry <= 30) {
    return {
      status: "expiring_soon",
      label: `Expiring in ${daysUntilExpiry}d`,
      daysUntilExpiry,
      badgeClass: "border-warning bg-warning-soft text-warning",
    }
  }

  const formatted = new Date(expiryDate).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  return {
    status: "valid",
    label: `Valid to ${formatted}`,
    daysUntilExpiry,
    badgeClass: "border-success bg-success-soft text-success",
  }
}

export function hasComplianceWarning(expiryDates: (string | null | undefined)[]): boolean {
  return expiryDates.some((date) => {
    const { status } = getComplianceStatus(date)
    return status === "expired" || status === "expiring_soon"
  })
}
