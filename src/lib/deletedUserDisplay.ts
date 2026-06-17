export function deletedAwareName(
  profile: { is_deleted?: boolean | null } | null | undefined,
  fallback: string
): string {
  return profile?.is_deleted ? "Deleted User" : fallback
}
