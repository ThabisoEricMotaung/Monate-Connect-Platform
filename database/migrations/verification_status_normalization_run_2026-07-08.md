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

## Live Data Cleanup - Role-Player Test Accounts

Purpose: permanently remove confirmed internal role-player supplier test accounts after Thabiso reviewed the candidate list and approved deletion.

Backup:
- `C:\tmp\profiles-role-player-test-accounts-backup-2026-07-08T14-50-10-318Z.json`
- Scope: full `profiles` rows, captured auth user records, and full dependent rows found during the read-only dependency scan.

Deleted accounts:
- GreenLeaf Construction (Pty) Ltd: `f23ff1a0-dd0b-4c0d-b5d5-1e5ab8755535`
- TechNova Solutions (Pty) Ltd: `549f7ec0-b1c6-4638-a4bd-2b637ec4d9f2`

Pre-delete counts matched the reviewed backup:
- GreenLeaf: `supplier_documents` 5, `supplier_bank_details` 0, `session_events` 37, `suggestions` 1, `profiles` 1.
- TechNova: `supplier_documents` 8, `supplier_bank_details` 1, `session_events` 51, `suggestions` 2, `profiles` 1.

Applied deletion:
- Removed 13 private `supplier-documents` storage objects for the two accounts before deleting their `supplier_documents` rows.
- Removed child rows from `supplier_documents`, `supplier_bank_details`, `session_events`, and `suggestions`.
- Removed both `profiles` rows.
- Confirmed `profiles` deletion does not cascade upward to `auth.users`; both auth users existed before the cleanup and were deleted explicitly via the Supabase admin API.

Post-delete verification:
- Both account IDs now have 0 rows in `profiles`, `supplier_documents`, `supplier_bank_details`, `session_events`, and `suggestions`.
- Both auth user lookups now return `User not found`.
- A profile search for GreenLeaf/TechNova/Naledi/Sipho/greenleaf/technova returned no lingering profile matches, so these accounts no longer feed the public supplier directory or the internal buyer-facing supplier directory.

Note:
- `scripts/smartscore-audit.mts` was not run by Codex after deletion; Thabiso should re-run it locally and confirm GreenLeaf and TechNova are absent from the SmartScore audit output.

## SmartScore Formula Redesign - Compliance Base and Capped Activity Bonus

Purpose: replace the legacy raw-points SmartScore formula with the approved trust-first model where compliance evidence is the base score and activity can only provide a small capped bonus.

Old formula:
- Added a fixed base offset, broad verification/document/profile/activity raw points, a recent-update bonus, and then divided the raw total by 10 before clamping to 0-100.
- This allowed activity and recency terms to blur the ordering between suppliers with different compliance completeness.

New formula:
- `score = clamp(complianceBase + activityBonus, 0, 100)`.
- `complianceBase` is the sum of the seven approved category rows:
  - Business profile complete: 20.
  - CSD verified: 20, or 10 pending/uploaded.
  - BBBEE verified: 20, or 10 pending/uploaded.
  - Tax verified: 15, or 7 pending/uploaded.
  - Banking verified: 10, or 5 pending/details supplied.
  - Director verified: 10.
  - Company profile document uploaded: 5.
- `activityBonus` is built from existing supplier activity signals, including RFQ responses, awarded quotes, completed contracts, paid invoices, payment reliability, reviews, recent activity, and a small recent-update nudge.

Activity cap:
- Total `activityBonus` is capped at 8 points.
- Rationale: the smallest verified compliance category is 10 points, so an 8-point total activity cap is intentionally below one additional verified category. This preserves the approved rule that compliance always outranks activity.

Implementation note:
- `calculateSupplierSmartScore()` now returns the final score plus the same seven category breakdown rows used to compute the compliance base, making the displayed breakdown and score share one source of truth.
- `getSmartScoreBreakdown()` was retired as a separate exported function.

## Live Data Cleanup - Leftover Test/OTP Supplier Accounts

Purpose: permanently remove confirmed leftover test/OTP supplier accounts after Thabiso reviewed the candidate list and explicitly approved deletion. `ndivhuwon26@gmail.com` / Ndivhuwo P was explicitly excluded and left untouched.

Backup:
- `C:\tmp\profiles-leftover-test-otp-suppliers-backup-2026-07-08T15-43-44-483Z.json`
- Scope: full `profiles` rows, captured auth user records, and full dependent rows found during the read-only dependency scan.

Deleted accounts:
- `aiformprocure@gmail.com`: `a96de250-af41-43aa-a35e-ffe4e228af22`
- `aiformprocure@outlook.com`: `b7f57bf4-9fc1-486c-af63-53657be4f36b`
- `aiformstudio+1@gmail.com`: `d88eb772-1a8b-4a78-94bf-cfd89d91a6b9`
- `aiformstudio+otp1@gmail.com`: `54829708-95f1-4db7-963c-6e1ca2ee79c5`
- `aiformstudio+otp2@gmail.com`: `17acea13-9fd3-4baa-9b0f-bcb2cca9c4d3`
- `aiformstudio+otp3@gmail.com`: `df326ed9-f427-42a6-ac31-774bea33893b`
- `mpotseng.motaung.mariam@gmail.com`: `a8832a47-29fe-4f07-9797-74a25eaf50af`
- `thabiso.eirc.motaung+test3@gmail.com`: `aae141e4-aacd-40ab-8c0b-ef648c0454e4`
- `thabiso.eirc.motaung+test4@gmail.com`: `59acf122-e7b9-4280-a0fd-b34da6e1f9b5`
- `thabiso.eirc.motaung+test5@gmail.com`: `c9b28a71-adad-4767-8c34-8d2d33f51f32`
- `thabiso.eric.motaung@gmail.com`: `c902b2fe-48b4-48e0-bb7f-d4cbc179fd81`
- `thabiso.motaung.eric@gmail.com`: `8b4ebd63-a623-4b86-a05e-dac614a98322`

Pre-delete counts matched the reviewed backup:
- `aiformprocure@gmail.com`: `session_events` 15, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `aiformprocure@outlook.com`: `session_events` 101, `subscriptions` 1, `suggestions` 0, `profiles` 1.
- `aiformstudio+1@gmail.com`: `session_events` 2, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `aiformstudio+otp1@gmail.com`: `session_events` 2, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `aiformstudio+otp2@gmail.com`: `session_events` 2, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `aiformstudio+otp3@gmail.com`: `session_events` 3, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `mpotseng.motaung.mariam@gmail.com`: `session_events` 1, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `thabiso.eirc.motaung+test3@gmail.com`: `session_events` 2, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `thabiso.eirc.motaung+test4@gmail.com`: `session_events` 3, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `thabiso.eirc.motaung+test5@gmail.com`: `session_events` 1, `subscriptions` 0, `suggestions` 0, `profiles` 1.
- `thabiso.eric.motaung@gmail.com`: `session_events` 3, `subscriptions` 0, `suggestions` 2, `profiles` 1.
- `thabiso.motaung.eric@gmail.com`: `session_events` 12, `subscriptions` 1, `suggestions` 0, `profiles` 1.
- All 12 accounts had 0 rows in `supplier_documents` and `supplier_bank_details`.

Applied deletion:
- Removed child rows from `session_events`, `subscriptions`, and `suggestions`.
- Removed all 12 `profiles` rows.
- Confirmed profile deletion does not cascade upward to `auth.users`; all 12 auth users existed before the cleanup and were deleted explicitly via the Supabase admin API.
- No `suggestion-attachments` storage objects were removed because the deleted suggestion rows had no stored attachment paths.

Post-delete verification:
- All 12 account IDs now have 0 rows in `profiles`, `session_events`, `subscriptions`, `suggestions`, `supplier_documents`, and `supplier_bank_details`.
- All 12 auth user lookups now return not found.
- The excluded Ndivhuwo P account remains present: `d4e55f36-f75d-4936-b07d-ee824f7b3bae`, `ndivhuwon26@gmail.com`, `role = supplier`.

Note:
- `scripts/smartscore-audit.mts` was not run by Codex after deletion; Thabiso should re-run it locally and confirm the SmartScore audit now shows only the real supplier base.
