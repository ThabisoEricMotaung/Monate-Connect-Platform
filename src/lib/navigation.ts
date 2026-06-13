export function roleHomeHref(role?: string | null): string {
  const normalizedRole = role?.trim().toLowerCase()

  if (normalizedRole === "admin") return "/dashboard/admin"
  if (normalizedRole === "buyer") return "/dashboard/buyer"

  return "/dashboard"
}
