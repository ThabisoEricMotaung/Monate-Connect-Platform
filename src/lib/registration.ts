export type RegistrationRole = "supplier" | "buyer"

export const REGISTRATION_EXEMPT_ACCOUNT_EMAILS = [
  "aiformprocure@gmail.com",
  "aiformprocurator@outlook.com",
  "aiformstudio@gmail.com",
] as const

export function isRegistrationExemptAccount(email?: string | null) {
  const normalized = email?.trim().toLowerCase()
  return REGISTRATION_EXEMPT_ACCOUNT_EMAILS.some((value) => value === normalized)
}

export type RegistrationProfile = {
  id?: string | null
  role?: string | null
  intended_role?: string | null
  registration_status?: string | null
}

export function normalizedRegistrationRole(value?: string | null): RegistrationRole | null {
  const role = value?.trim().toLowerCase()
  return role === "supplier" || role === "buyer" ? role : null
}

export function isPrivilegedRegistrationRole(value?: string | null) {
  const role = value?.trim().toLowerCase()
  return role === "admin" || role === "curator"
}

export function hasCompletedRegistration(profile?: RegistrationProfile | null) {
  if (!profile?.id) return false
  if (isPrivilegedRegistrationRole(profile.role)) return true
  return profile.registration_status === "complete" && normalizedRegistrationRole(profile.role) !== null
}

export function registrationDestination(profile?: RegistrationProfile | null) {
  if (!hasCompletedRegistration(profile)) return "/register?source=oauth"
  const role = profile?.role?.trim().toLowerCase()
  if (role === "admin") return "/dashboard/admin"
  if (role === "buyer") return "/dashboard/buyer"
  return "/dashboard"
}
