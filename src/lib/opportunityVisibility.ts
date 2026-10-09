/**
 * Records a curator (or the eTenders terminal-notice check) has quarantined —
 * regret letters, award notices, cancellations — are never shown publicly,
 * whatever their is_public flag says. Every public query of rfqs applies this
 * on top of is_public. (curation_status is NOT NULL, default 'not_required'.)
 *
 * "pending" is deliberately NOT excluded here: it means "awaiting curator
 * review", and its visibility is governed by is_public (new eTenders and
 * collector review items are stored non-public).
 *
 * Kept free of server-only imports so client components can use it too.
 */
type FilterBuilder = { neq(column: string, value: unknown): FilterBuilder }

export function excludeQuarantined<Q>(query: Q): Q {
  return (query as unknown as FilterBuilder).neq("curation_status", "quarantined") as unknown as Q
}
