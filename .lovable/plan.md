
This round is large. I'll implement it in the order you specified and validate Part A visually before moving on. Here's what I'll build and the judgment calls I'll make.

## Part A — Bug fixes (do first, verify by driving the preview)

- **A1 Register link**: audit `/auth`'s "Request access" link, confirm `src/routes/register.tsx` is in `routeTree.gen.ts`, and that the link uses `<Link to="/register">`. Playwright: load `/auth`, click, assert `/register` renders the form.
- **A2 Username OR email login**: add `username` (unique) to `StoredUser` + migration `0003_username.sql`. Register + Admin "Create user" forms collect username. Login field label becomes "Email or username" — if input contains `@`, match by email else by username. Migration back-fills username from the local-part of email for existing rows.
- **A3 Real sessions**:
  - On successful login: mark all prior sessions for that user `revoked` (single active session per account — simpler + matches your test criteria).
  - `Last active` updated on every route change via a small `useTouchSession` hook in `AppShell`.
  - Sign-out revokes the current session immediately.
  - Sessions tab derives status: `Revoked` if revoked, else `Expired` if `lastActiveAt` older than 8h, else `Active`.
- **A4 Templates**: rebuild `src/lib/templates.ts` using `exceljs` (already common) or hand-rolled OOXML — I'll use `exceljs` (add dep). Set explicit column widths sized to header + sample, bold header fill (`FFEFEFEF`), freeze row 1, one example row, no merged cells, `.xlsx` mime. Verify by generating in Node and opening bytes with `unzip -l` + parsing back with `exceljs` to confirm styles round-trip.
- **A5 Liquid glass rework**: rebuild the shell so navbar + sidebar are inset floating panels (margin around them, `rounded-2xl`), heavy `backdrop-blur-2xl`, translucent bg (`bg-white/55 dark:bg-slate-900/45`), inner top highlight via `::before` gradient border, layered shadows, and an app-wide ambient background: two low-opacity radial gradient blobs fixed behind everything (pink/violet in light, indigo/cyan in dark). Apply same treatment to `DropdownMenu`, `Dialog`, `Popover`, and Settings/Help `TabsList`+`TabsContent`. Respect `prefers-reduced-motion`.

## Part D — Security hardening (before Phase 2 so new modules use it)

- Real server auth at `src/routes/api/auth/{login,register,logout,me}.ts` using D1 via `env.DB` from `getRequest()` context (Cloudflare bindings). PBKDF2 verify server-side; issue `sid` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`.
- `sessions` table in D1 with `id, user_id, created_at, last_active_at, revoked_at, ip, ua`.
- Rate limit: KV namespace `RATE_LIMIT` — 5 login attempts / 15 min / IP+identifier; 3 registrations / hour / IP. Documented `wrangler kv namespace create RATE_LIMIT` step.
- Security headers in `src/server.ts`: `Content-Security-Policy` (self + inline styles for tailwind, `'unsafe-inline'` only for styles, no inline scripts), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- All D1 queries use `?` placeholders — audit and confirm.
- Client keeps the Zustand store as an offline fallback + optimistic cache; when `env.DB` is bound (detected via `/api/auth/me` returning 200), the store hydrates from server. When not bound (Lovable preview), it falls back to local storage so testing still works.

**What can't be verified in preview**: real cookie `Secure` + cross-domain behavior, KV rate-limit counters, and CSP enforcement all require a Cloudflare deploy. Code paths are complete and typed.

## Part B — Phase 2 data model

- **B1**: add `unit`, `statusInstrument`, `subType` to `Instrument`. New Settings lists `units[]`, `instrumentStatuses[]` (seeded `Active`, `Standby`, `Decommissioned`). Filter chips on Instruments/Maintenance/Dashboard extended with `Unit`. `statusInstrument` shows as badge.
- **B2 Task List master**: `taskListItems: {id, equipmentType, activityName, category, mandatory}` in store + Settings tab "Task List". Admin & User editable.
- **B3 PM Detail**: `pmDetails: {id, pmTaskId, taskName, result: 'OK'|'NG', catatan?}`. Expandable checklist in PM Task detail; pre-populates from Task List for that equipment type.
- **B4 Calibration**: new sidebar item `/calibration`, table + add/edit dialog. `error = asFound - asLeft` (numeric difference); note in README that % deviation can be swapped in later.
- **B5 Downtime**: `/downtime`, auto `durasi` in minutes (rendered as `Hh Mm`).
- **B6 Failure History**: `/failures`.
- **B7 Reliability Analytics**: new Dashboard card group "Reliability (Phase 2)". MTTR = mean downtime duration. MTBF = mean gap between consecutive `failureDate`s per instrument, then averaged. Availability = `MTBF/(MTBF+MTTR)`. Empty-data guard shows the "Not enough data yet…" message per metric.
- **B8 Good/Substandard/Remaining**: stacked bar on Dashboard per Area and per Equipment Type using the mapping you specified. Legend footnote calls out the assumption.
- **B9 Completion Rate KPI**: all-time `Finish / total` scheduled records, separate card from "Progress PM Bulan Ini".
- **B10 Evidence**: add `evidence?: string` to `PmTaskRecord`; remove `"evidence"` from `IGNORE_HEADERS` and add alias `evidence: ["evidence","bukti","foto","attachment","photo"]`. Rendered in task detail; note about R2 future upload in README.
- **B11 Help & Guide + Smart Import aliases + README** — bilingual EN/ID sections added for each new module; new aliases (`asFound`, `asLeft`, `error`, `result`, `startTime`, `finishTime`, `penyebab`, `tindakan`, `severity`, `rootCause`, `unit`, `statusInstrument`, `subType`, `evidence`).

## Part C — Smart Import patterns

Rewrite `src/lib/smart-import.ts` sheet router:
- **Pattern detection order** per sheet: (1) sheet name starts with "Task List" OR has `URAIAN PEKERJAAN` + no `Tag Number` → Pattern B. (2) Two-row header with `Good/Repair/Broken` triplets → Pattern A (parse main region + embedded downtime region). (3) Else existing header-scan (Instrument / PM Task / summary skip).
- **Pattern A**: infer `equipmentType` from sheet name (`PM Control Valve` → `Control Valve`, `Junction Box` → `Junction Box`). Emit one PM Task Record per row + one PM Detail per non-blank component group. If component group not in Task List for that equipment type → auto-create the Task List entry (simplest, avoids free-text drift). Bare-year dates parsed as empty planDate — row still imported.
- **Pattern A Region B (embedded Catatan Pemeriksaan)**: scan below the main table for header row containing `Equip. No.` + `Gangguan` + `Tindakan`; emit Downtime records. Blank rows skipped; missing region does not block Region A.
- **Pattern B**: emit Task List entries only; `category` = most recent all-caps section header; `mandatory = true` default. Ignore P/K/supervisor columns.
- **Preview UI (C4)**: import wizard now shows per-sheet outcome lines like `PM Control Valve → 12 PM Tasks + 34 PM Details`, `Task List Transmitter → 18 Task List entries`, `Transmitter_1 → 89 Instruments`. Confirm dialog groups by outcome type before committing.

## Part E — README

Update sections: bug-fix changelog, Phase 2 modules (Calibration/Downtime/Failures/Task List/PM Detail + formulas + empty-data behavior), Unit/Status Instrument/Sub-Type fields, Good/Substandard/Remaining mapping, Completion Rate scope, Evidence tracking (+ R2 note), the two Smart Import patterns + embedded Downtime region, server-auth deploy steps (D1 migration 0003, KV namespace create, security headers), and an "Open questions for client" callout listing B1/B8/B9/C1 assumptions.

## Judgment calls (flagged in reply after implementation)

- Single active session per user (A3) rather than multi-device — matches your test spec exactly.
- Calibration lives at its own `/calibration` sidebar item (cleaner than nesting inside PM Status).
- Reliability metrics live in a "Reliability (Phase 2)" section on the Dashboard, below Progress PM, not a separate route — keeps a single overview.
- Pattern A auto-creates missing Task List entries rather than storing free text on PM Detail.
- MTBF: per-instrument mean gap between consecutive failures, then simple mean across instruments with ≥2 failures.
- Rate limits: 5/15min login, 3/hour register — conservative defaults, tunable in one constant.

Approve and I'll start with Part A and drive Playwright to confirm A1–A3 visually before continuing.
