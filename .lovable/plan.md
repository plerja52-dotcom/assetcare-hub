## Scope

Ten-part upgrade to the Reliability Instrumentation Dashboard. I'll execute in the order you listed. Before I start, one architectural note and one small question at the end.

## Architectural note — Cloudflare Pages + D1 vs. current stack

The project today is **TanStack Start** running on a **Cloudflare Worker** (not Cloudflare Pages). TanStack Start owns SSR, routing, and server functions through Vite + a Worker entry — it is not a static site with Pages Functions bolted on. So the literal "Cloudflare Pages Functions + `functions/` folder + `wrangler pages deploy`" flow you described doesn't cleanly fit this codebase.

Two realistic ways to give you what you actually want (auth + multi-user + D1, deployable on Cloudflare with minimal setup):

- **Option A — Keep TanStack Start, add D1 binding to the existing Worker.** Backend code lives in TanStack `createServerFn` + `src/routes/api/*` server routes (already the pattern here). `wrangler.toml` gets a `[[d1_databases]]` binding. Deploy with `wrangler deploy` (Workers) rather than `wrangler pages deploy`. Everything you asked for still works: login, sessions, hidden admin page, D1 as source of truth, migrations via `wrangler d1 execute`. This is the low-risk path and matches how the app is already built.
- **Option B — Rip out TanStack Start, rebuild as a Vite SPA + Cloudflare Pages Functions in `/functions`.** Matches your description literally but is essentially a rewrite of the routing/SSR layer and throws away the current server-function scaffolding.

**I recommend Option A.** I'll still write the README's "Deploying to Cloudflare" section as a clear top-to-bottom walkthrough (Wrangler install, `d1 create`, paste `database_id`, run migrations local + `--remote`, `wrangler secret put SESSION_SECRET`, `wrangler deploy`, first-admin bootstrap, verification, redeploys). The commands change slightly (`wrangler deploy` instead of `wrangler pages deploy`) but the experience is the same: connect account, create DB, migrate, deploy, log in.

If you truly need Pages Functions specifically (e.g. company policy), say so and I'll do Option B instead — but expect a much larger diff and some feature regressions during the rewrite.

## Execution order

1. **Dark-mode header bug + hardcoded-color audit.** Fix `AppShell.tsx` brand text to `text-foreground` / `text-muted-foreground`. Grep the codebase for `text-black`, `bg-white`, `text-white`, hex literals in components, and swap for semantic tokens.
2. **Visual polish.**
   - Rebalance chart palette: introduce `--chart-1..5` tokens (blue, green, amber, violet, neutral) in `styles.css`; reserve `--primary` (red) for critical/urgent states only. Update Recharts usages in `routes/index.tsx` and elsewhere.
   - Card elevation: subtle shadow tokens, hover lift, focus-visible rings.
   - Table row hover, zebra option, tighter density, clearer text hierarchy (primary / secondary / label).
   - Micro-interactions: page-transition fade, KPI count-up (tiny `useCountUp` hook, no new dep), row hover transitions.
3. **Remove seed data + empty states.**
   - `seed.ts` → export empty arrays (keep `defaultSettings` for initial config).
   - Add a shared `<EmptyState icon title description action />` component.
   - Wire empty states into Dashboard KPIs (show `—`/`0`, guard against `NaN`), all charts (placeholder panel), Instruments table, Maintenance table, Health grid, Notifications list.
   - Guard `kpi.ts` divisions so MTBF/MTTR/Availability return `null` when denominator is 0; KPI card renders `—` for `null`.
4. **Auth + login page.**
   - New `/auth` route: Pertamina mark, app name, email + password, "Sign In", generic "Invalid email or password" error, subtle brand background.
   - Session: signed JWT in httpOnly cookie, verified server-side each request via a TanStack `functionMiddleware` and `beforeLoad` in `_authenticated` layout.
   - All existing app routes move under `src/routes/_authenticated/` so the gate is automatic.
   - Log-out item in the top navbar user menu; clears cookie, invalidates router, redirects to `/auth`.
5. **Hidden `/admin/users` page.**
   - Route lives under `_authenticated/admin/users.tsx` with a `beforeLoad` role check (`role !== 'admin'` → redirect to `/`).
   - Not added to sidebar nav.
   - Table + form: create / edit / deactivate users (name, email, password on create/reset, role Admin/Engineer/Viewer). Passwords hashed server-side (PBKDF2 via WebCrypto — available on Workers, no native deps).
6. **Help / Page Guide.**
   - `/help` route added to sidebar (Help icon, placed above Settings).
   - Accordion sections per page (Dashboard, Instruments, Maintenance, Health, Notifications, Input, Settings, and a short Admin note visible only to admins).
   - Plain-language formulas for Availability, MTBF, MTTR, Health Score, PM/CM ratio.
7. **Cloudflare D1 backend (Option A).**
   - Add `wrangler.toml` with `[[d1_databases]] binding = "DB"`.
   - `migrations/0001_init.sql`: `users`, `instruments`, `maintenance_records`, `settings`, `escalation_rules` (mirrors `types.ts`, adds `password_hash`, `role`, `active`).
   - Server layer:
     - `src/lib/db.server.ts` — typed D1 helpers (`getDb()` reads binding from request env).
     - `src/lib/auth.server.ts` — hash/verify, JWT sign/verify (WebCrypto HMAC-SHA256), session cookie helpers.
     - `src/lib/*.functions.ts` — `createServerFn` for instruments, maintenance, users, settings, auth (login/logout/me), gated by `requireAuth` / `requireAdmin` middleware.
   - Client refactor:
     - Zustand store becomes UI-state only; data reads move to TanStack Query with server functions as `queryFn`.
     - Mutations invalidate relevant query keys.
     - Existing pages updated to consume queries instead of `useAppStore` collections.
   - First-admin bootstrap: `/api/public/bootstrap-admin` route that only works while `users` table is empty; documented in README.
8. **README revision (sections a–j updated in place).** Features, tech stack, data model (adds `users`, hashed passwords, roles), folder tree (new files), data flow (client → server fn → D1), removed seed note + first-admin instructions, local dev updated for `wrangler dev` + local D1.
9. **New README section: "Deploying to Cloudflare."** Prerequisites → `wrangler d1 create` → paste `database_id` → migrations local + `--remote` → `wrangler secret put SESSION_SECRET` → deploy (Git integration via Workers Builds *and* `wrangler deploy` CLI path) → first-admin bootstrap → verification checklist → redeploy flow.
10. **Tab title + favicon.** Set `<title>` to "Pertamina Reliability Instrumentation" in `__root.tsx`. Wire favicon slot for the Pertamina icon-only mark (see question below).

## Technical notes

- **Passwords**: PBKDF2-SHA256, 100k iterations, per-user random salt, all via WebCrypto (Workers-compatible, no bcrypt native dep).
- **Sessions**: JWT (HS256) in httpOnly + Secure + SameSite=Lax cookie, 7-day expiry, signed with `SESSION_SECRET`.
- **D1 access**: Env is read per-request inside handlers via `getRequest()` + `env` from the Worker fetch context; no module-scope env reads.
- **Migrations**: single `migrations/0001_init.sql`, applied with `wrangler d1 execute reliability-dashboard --file=./migrations/0001_init.sql` (local) and `--remote` for prod.
- **Backward compatibility**: existing localStorage data is not migrated (the app was single-user local); README calls this out.

## One question before I start

**Favicon asset** — you said "I'll provide the icon asset." Do you want to:
- (a) upload the Pertamina icon-only mark now (drop it in chat), and I wire it in, or
- (b) have me generate a stylized placeholder icon (colorful star mark) now and you swap the file later?

Everything else I can start on immediately once you approve the plan and Option A vs. Option B.
