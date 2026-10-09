# Thuso assistant: release notes

Branch `feat/thuso-consolidation`, based on `ea765af`. Covers the single shared
Thuso panel and the secured `/api/thuso/chat` endpoint.

## What changed

- One assistant instance, mounted once in the root layout (`ThusoProvider`): one
  launcher, one panel (overlay side panel on desktop, full-screen sheet on
  mobile). Contextual "Ask Thuso" buttons open the same panel.
- Removed the competing assistants: `ThusoWidget`, the embedded
  `ThsuoWorkspace`, the page-level workspace chats, the canned
  `chatIntegration` replies and the unmounted `UnifiedSupportCenter`.
- One promotional introduction per dashboard; no fake chat bubbles.
- `/dashboard/supplier/workspace`, `/dashboard/buyer/workspace` and
  `/dashboard/help` accept `rfqId` and the legacy `rfq_id`, and open the shared
  panel instead of embedding a chat.
- Accessibility settings have their own dialog (`AccessibilitySettingsDialog`),
  separate from the assistant.
- Thuso is read-only: it cannot upload, submit or change anything.

## Server access rules (`/api/thuso/chat`)

- Identity comes from the Supabase session cookie; the role comes from
  `profiles` on the server. Browser-supplied role, user ID and context text are
  ignored.
- If the profile lookup fails, throws or finds no row, the user is
  **unverified**: public help only, no private record context.
- Context is requested by record ID only. Visibility mirrors the `rfqs_select`
  policy plus curation: public and not quarantined for everyone; buyers also
  see RFQs they created or own; admins see any RFQ. Missing and forbidden
  records get the same 404.
- Tender text and user messages are treated as untrusted content in the prompt.
- Browser-held history is authenticated (see below) and also described to the
  model as unverified.
- `/api/assistant` and `/api/thuso-feedback` are retired (410, no work done).

## Configuration

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Yes | Model access (unchanged). |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side role and record lookups (unchanged). |
| `THUSO_HISTORY_SECRET` | Recommended | Signs conversation history. |
| `THUSO_ANONYMOUS_AI` | Leave unset | `enabled` allows signed-out visitors to use the model. |

### History signing secret

After each reply the server returns the exact history window it will accept
next, with an HMAC-SHA256 over the viewer (account and role), the record and
every turn's role and content in order. History is used only when the
signature matches exactly; anything edited, reordered, inserted, removed,
replayed by another account or role, or moved to another record is dropped.

- Set `THUSO_HISTORY_SECRET` to a random value of at least 32 characters, for
  example `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- Use a different value for Production, Preview and local development, and
  mark it Sensitive in Vercel.
- If it is unset (or shorter than 32 characters), a key derived from
  `SUPABASE_SERVICE_ROLE_KEY` is used. If neither is available, history is
  never signed or used, and each question is answered on its own.
- Rotating it is safe: conversations in progress lose their earlier context
  once, and nothing else is affected.

### Anonymous AI

`THUSO_ANONYMOUS_AI` is unset, so signed-out visitors get "Sign in to chat with
Thuso." (401) and no model call is made. Keep it unset until a durable usage
limit exists (see Limitations).

## Verification

### Automated (run on this branch)

- `src/app/api/thuso/chat/route.test.ts` (58 tests): role from profile, not the
  request; unverified fallback for each failure mode; record access matrix for
  anonymous, supplier, buyer and admin across public, private, quarantined and
  missing records; prompt-injection containment; anonymous switch; rate limits;
  history signing, including 11 tampering cases and replay by other accounts,
  roles and records; retired endpoints. Record data and the model are stubbed.
- `src/lib/thuso/session.test.ts` (14 tests): sign-out and account switch during
  a request, same-account restore, context labels, signed-window handling,
  `rfqId` / `rfq_id` parsing.
- Browser checks against a local production build, with `/api/thuso/chat`
  intercepted (22 checks, desktop and mobile): one launcher and no embedded
  chat on `/`, `/tenders` and `/about`; focus moves in, stays in and returns;
  Escape and close button; conversation kept across client navigation and
  reload; tender page context sent by ID and labelled; refused record falls
  back to general help; accessibility dialog separate; legacy `rfq_id` link.
- Type check, lint on changed files and `next build` pass. The full suite has
  two failures that also fail on `ea765af` (`publicMetadata`,
  `reviewMigration`), unrelated to Thuso.

### Manual (by the product owner)

- 2026-10-09: the product owner approved the panel's presentation and reported
  that the functional checks available to them passed, on the local preview of
  this branch. The roles covered were not itemised.

### Not yet tested

- Supplier, buyer and admin dashboards in a browser while signed in are not
  confirmed by name: no test accounts were available for automated runs, and
  the manual record above does not list roles. Each role should be confirmed
  against the checklist below before production.
- The unverified-role fallback has not been seen in a browser (unit tests only).
- Sign-out in another tab while a reply is pending (the session tests cover the
  same tab).
- Live record access against production data (private, owned and quarantined
  RFQs): covered by tests with stubbed data only.

### Per-role checklist

- Supplier: one launcher on `/dashboard`; "Ask Thuso about your top match"
  opens the panel on that RFQ; answers labelled "Supplier assistant";
  conversation survives navigation; another buyer's private RFQ is refused.
- Buyer: one introduction on `/dashboard/buyer`; own private RFQ discussable;
  another buyer's RFQ refused.
- Admin: launcher only on `/dashboard/admin`; "RFQ Action Assistant" opens the
  panel; "Admin assistant"; private and quarantined RFQs discussable.
- Account switching: sign out during a reply shows no reply; signing in as
  another role shows none of the earlier conversation.

## Limitations

- Usage limits are held in memory per server instance (10 per 10 minutes per
  IP signed out, 30 per 5 minutes per account). They bound bursts but are not
  a deployment-wide budget: instances do not share counts, cold starts reset
  them, and rotating IPs avoids the per-IP limit. Before enabling anonymous AI,
  add a durable counter (for example a Supabase table updated atomically per
  key and window, with a global daily cap) and an OpenAI project spend limit.
- The history signature proves the history came from this server for this
  viewer and record; it has no expiry, so a signed window can be replayed by
  the same account on the same record later. That window was already visible
  to that account.
- Unused after this change and left for a separate cleanup:
  `SupplierSidebar`, `BuyerSidebar`, `QuickActionButtons`,
  `BuyerQuickActionButtons`, `ProjectStatusCard`, `SupplierScoringCard`,
  `ResponsiveLayout`, `useSupplierWorkspace` / `useBuyerWorkspace`,
  `src/lib/thuso/fileUpload.ts`, and the `thuso_feedback` table.
- No in-app feedback form is mounted (the production-readiness check reports
  this as a warning).
