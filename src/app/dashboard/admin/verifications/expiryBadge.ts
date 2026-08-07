export function isExpired(dateValue: string | null): boolean {
  if (!dateValue) return false
  const expiry = new Date(dateValue)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return expiry < today
}

const EXPIRING_SOON_WINDOW_DAYS = 30

function isExpiringSoon(dateValue: string | null): boolean {
  if (!dateValue || isExpired(dateValue)) return false
  const expiry = new Date(dateValue)
  if (Number.isNaN(expiry.getTime())) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  const daysUntil = Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntil <= EXPIRING_SOON_WINDOW_DAYS
}

// Computed live from expiry_date, same as categoryState() in
// supplierVerification.ts -- no cron needs to run first for this to show up.
export function documentExpiryBadge(expiryDate: string | null): { label: string; className: string } | null {
  if (isExpired(expiryDate)) {
    return { label: "Expired", className: "border-rose-500/30 bg-rose-500/10 text-rose-700" }
  }
  if (isExpiringSoon(expiryDate)) {
    return { label: "Expiring soon", className: "border-warning bg-warning-soft text-warning" }
  }
  return null
}
