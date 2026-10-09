/**
 * Who is asking Thuso, and which RFQ records they may discuss.
 *
 * Identity and role always come from the server session and the profiles
 * table — never from the browser. RFQ visibility mirrors the rfqs_select RLS
 * policy plus the curation rule every public query applies:
 *   - anyone: is_public = true and not quarantined (as on /tenders/[id])
 *   - buyers: also RFQs they created or own
 *   - admins: any RFQ
 * Enforced here as well as by RLS because Thuso reads with the service role.
 *
 * A signed-in user whose profile or role cannot be loaded is "unverified":
 * they get public help only, never account or private-record context.
 */

export type ThusoRole = "supplier" | "buyer" | "admin"

export type ThusoViewer =
  | { kind: "anonymous" }
  | { kind: "unverified"; userId: string }
  | { kind: "user"; userId: string; role: ThusoRole }

export type ThusoViewerLabel = "anonymous" | "unverified" | ThusoRole

export type RfqAccessRow = {
  is_public?: boolean | null
  curation_status?: string | null
  created_by?: string | null
  buyer_user_id?: string | null
}

export type RfqAccessReason = "public" | "owner" | "admin"

/** Unknown role strings get the least-privileged signed-in role. */
export function roleFromProfile(role: unknown): ThusoRole {
  const normalized = typeof role === "string" ? role.trim().toLowerCase() : ""
  if (normalized === "admin") return "admin"
  if (normalized === "buyer") return "buyer"
  return "supplier"
}

export function isPubliclyVisible(row: RfqAccessRow): boolean {
  return row.is_public === true && row.curation_status !== "quarantined"
}

/** Why the viewer may see this RFQ, or null when they may not. */
export function rfqAccessReason(viewer: ThusoViewer, row: RfqAccessRow): RfqAccessReason | null {
  if (viewer.kind === "user") {
    if (viewer.role === "admin") return "admin"
    if (viewer.role === "buyer" && (row.created_by === viewer.userId || row.buyer_user_id === viewer.userId)) return "owner"
  }
  return isPubliclyVisible(row) ? "public" : null
}

export function viewerLabel(viewer: ThusoViewer): ThusoViewerLabel {
  return viewer.kind === "user" ? viewer.role : viewer.kind
}

/** Stable identity used to bind conversation history; changes with the role. */
export function viewerKey(viewer: ThusoViewer): string {
  if (viewer.kind === "anonymous") return "anonymous"
  if (viewer.kind === "unverified") return `unverified:${viewer.userId}`
  return `user:${viewer.userId}:${viewer.role}`
}
