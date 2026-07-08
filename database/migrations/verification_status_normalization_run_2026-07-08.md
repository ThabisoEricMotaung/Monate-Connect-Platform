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
