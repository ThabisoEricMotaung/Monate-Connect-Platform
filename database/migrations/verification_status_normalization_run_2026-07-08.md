# Verification Status Normalization Run - 2026-07-08

Purpose: canonicalize verified statuses to `Verified` without changing unverified or pending statuses.

Backup:
- `C:\tmp\profiles-verification-status-backup-2026-07-08T06-59-17-466Z.json`
- Scope: `profiles.id`, `profiles.business_name`, `profiles.role`, `profiles.verification_status`, plus `supplier_bank_details.id`, `supplier_bank_details.supplier_id`, `supplier_bank_details.verification_status`.

Dry-run counts before:
- `profiles`: `Verified` 2, `Pending Review` 17.
- `supplier_bank_details`: `Unverified` 4, `verified` 2.

Applied result:
- `profiles`: 0 rows changed.
- `supplier_bank_details`: the 2 lowercase `verified` rows were canonicalized to `Verified`.

Correction during run:
- The first normalization predicate matched `Unverified` because it used a broad contains-`verified` rule.
- Rows `supplier_bank_details.id in (1, 3, 4, 5)` were restored from backup to `Unverified`.
- The code helper and SQL migration were updated to exclude statuses containing `unverified`.

Final counts after correction:
- `profiles`: `Verified` 2, `Pending Review` 17.
- `supplier_bank_details`: `Unverified` 4, `Verified` 2.

Spot-check:
- DEE CONNECTS profile `046571fa-3d08-42e5-952c-c762d65af8b6` remains `Verified`.
- DEE CONNECTS banking row `supplier_bank_details.id = 6` is now canonical `Verified`.

## Follow-up Verification - Public Directory and Banking Cascade

Additional code hardening completed after acceptance testing:
- Public `/suppliers` is now dynamic rendering, not static prerendering.
- Public directory rows are filtered with `isVerifiedStatus(verification_status)` and unverified suppliers are excluded from the "Verified Supplier Directory".
- Public directory SmartScore is computed live with `calculateSupplierSmartScore()` plus shared supplier activity data, rather than trusting persisted `profiles.smart_score`.
- Bulk "Verify Supplier" no longer sets `bank_verified` and no longer writes `supplier_bank_details.verification_status`; banking must be verified through the dedicated banking step.

Read-only production check after the follow-up:
- Supplier rows: 18.
- Public verified suppliers by current rule: 0.
- DEE CONNECTS current live profile state at check time: `verification_status = Pending Review`, `smart_score = 36`.
- Suppliers with `bank_verified` or `banking_verified` flags: 0.
- Suppliers with banking flags but no verified banking record: 0.

Note: the earlier spot-check captured DEE CONNECTS before later verification-state changes. The latest production check is the current source of truth.

## Follow-up Verification - SmartScore Field Selection

Additional code hardening completed after the login/quote-review audit:
- Login no longer recalculates or writes `profiles.smart_score` while patching missing province, industry, or phone metadata.
- The login profile fetches include verification flags so any future scorer use has the required status fields available.
- Quote review now selects `csd_verified`, `bbbee_verified`, `tax_verified`, `director_verified`, `bank_verified`, and `banking_verified`, and computes SmartScore with supplier quote/contract/invoice/payment activity.
- Buyer supplier directory, matching, intelligence, and purchase-order supplier loaders now select the same verification flags before calling `calculateSupplierSmartScore()`.
- `SUPPLIER_SMART_SCORE_PROFILE_SELECT` was added beside `SupplierSmartScoreProfile` as the shared field-list reference for future scorer-backed profile queries.

Read-only production SmartScore drift check after this follow-up:
- Supplier rows checked: 18.
- Stored `profiles.smart_score` mismatches against current canonical calculation: 17.
- Notable named mismatches: Mukonisi Holdings stored 50 vs canonical 28; Viconia Projects and Supply stored 50 vs canonical 27; DEE CONNECTS stored 36 vs canonical 42; GreenLeaf Construction stored 22 vs canonical 46.
- No live score writes were performed during this check.
