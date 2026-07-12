# Pertamina Reliability Instrumentation

Preventive Maintenance (PM) and Corrective Maintenance (CM) tracking for instruments in **Maintenance Area 2, PT Kilang Pertamina Internasional RU VI Balongan**.

Modern, browser-based dashboard built with React + TanStack Start, deployable to **Cloudflare Workers** with **D1** as the database.

---

## a. Project Overview

This app helps maintenance & reliability engineers in Area 2 track instrument health, calibration schedules, PM/CM history, and reliability KPIs (Availability, MTBF, MTTR) in one place — replacing scattered Word/Excel logs with a live dashboard.

The app now supports **multi-user access with authentication**, so different engineers can sign in from different devices and share the same data.

## b. Feature List

**Pages**
- **Login Page** (`/auth`) — clean, on-brand sign-in. On a fresh install, the first person to open the app is prompted to create the initial **Admin** account (bootstrap).
- **Dashboard Overview** — KPIs (Total Instruments, Availability, MTBF, MTTR, Overdue Calibrations, PM/CM ratio), PM vs CM donut, per-unit bar chart, health score distribution, monthly trend line, global filters (unit, criticality). Balanced chart palette — red is reserved for genuinely critical/urgent states.
- **Instruments** — searchable/filterable/paginated table, criticality badges, detail drawer with history + next calibration.
- **Maintenance History** — full PM/CM log with filters and CSV export.
- **Health & Calibration** — traffic-light card grid, early warning for overdue / due-soon calibrations.
- **Notifications & Escalation** — active alerts + editable escalation matrix.
- **Input Data** — Manual Entry (2-step wizard) + Import from File (CSV / XLSX / DOCX).
- **Settings** — health thresholds, calibration tolerance, PM/calibration intervals per type, JSON backup export/import, reset.
- **Help & Guide** (`/help`) — built-in user guide explaining every page and how the numbers are calculated.
- **Admin — User Management** (`/admin/users`, hidden) — create/edit/deactivate accounts and change roles. **Not shown in the sidebar** and only reachable by accounts with the **Admin** role; non-admins are redirected to the dashboard.

**Empty states**
The app now ships with **no seed data** — a fresh install is truly empty. Every page and widget has a tidy empty state with a clear next action; layouts don't collapse when there's no data yet.

**KPI formulas (plain language)**
- **Availability** = (total operating hours − total downtime hours) ÷ total operating hours × 100
- **MTBF** = total instrument operating days ÷ number of CM events
- **MTTR** = total repair hours ÷ number of CM events
- **PM/CM Ratio** = PM count ÷ total (and CM count ÷ total)
- **Health Score** starts at 100, −8 per CM event, up to −30 for overdue calibration (proportional to days overdue), −5 if due within 14 days, −10 if last calibration deviation exceeds tolerance. Bands: ≥90 Excellent, ≥70 Fair, <70 Poor.

## c. Tech Stack

- **React 19 + Vite 7** — UI and build tool.
- **TanStack Start + TanStack Router** — file-based routing, SSR-ready.
- **TanStack Query** — data cache.
- **Tailwind CSS v4** — design tokens in `src/styles.css`.
- **shadcn/ui + Radix UI** — accessible components.
- **Recharts** — theme-aware charts.
- **Zustand + persist** — client-side UI state.
- **PapaParse / xlsx / mammoth / sonner** — file parsing + toasts.

**Backend & hosting**
- **Cloudflare Workers** — the app is bundled as a Worker (TanStack Start's Cloudflare target) via Wrangler.
- **Cloudflare D1** — SQLite-based serverless SQL database, bound to the Worker.
- **Wrangler** — CLI for `d1 create`, `d1 execute`, `deploy`.

> **Migration status.** This release wires **authentication and user management to be D1-backed** on Cloudflare; the schema for `instruments`, `maintenance_records`, `settings`, and `escalation_rules` is created by the migration so the database is fully provisioned. In this release, the **application data** (instruments / maintenance / settings) is still read/written through the browser store on the client — swapping those reads/writes to D1 server functions is the recommended next iteration and does not require any schema changes. Auth already works end-to-end against D1 on deploy.

## d. Project / Folder Structure

```
migrations/
└── 0001_init.sql             # D1 schema (users, instruments, maintenance, settings, sessions)
public/
└── favicon.png               # Pertamina icon mark (swap in the official asset)
src/
├── assets/                   # CDN asset pointers (Pertamina logo)
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/AppShell.tsx   # navbar + sidebar + user menu + drawer
│   ├── badges.tsx
│   ├── empty-state.tsx       # shared empty-state component
│   └── kpi-card.tsx          # KPI card (count-up) + PageHeader
├── lib/
│   ├── auth-store.ts         # client session + password hashing helpers
│   ├── types.ts              # Instrument / MaintenanceRecord / Settings
│   ├── store.ts              # Zustand store (instrument/maintenance UI state)
│   ├── seed.ts               # EMPTY seed + default Settings
│   ├── kpi.ts                # Availability / MTBF / MTTR / health score
│   ├── theme.tsx             # Light/dark theme provider
│   └── utils.ts
├── routes/
│   ├── __root.tsx            # Providers, meta, favicon, auth gate
│   ├── auth.tsx              # Login + first-admin bootstrap
│   ├── index.tsx             # Dashboard
│   ├── instruments.tsx
│   ├── maintenance.tsx
│   ├── health.tsx
│   ├── notifications.tsx
│   ├── input.tsx
│   ├── help.tsx              # Help & Guide
│   ├── settings.tsx
│   └── admin.users.tsx       # HIDDEN — /admin/users, admin-only
├── server.ts                 # Worker fetch entry (TanStack Start SSR)
└── styles.css                # Tailwind + Pertamina tokens (light/dark)
wrangler.toml                 # Cloudflare Worker + D1 binding
```

## e. Data Model

**users** (D1)
| Field | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `name` | TEXT | |
| `email` | TEXT UNIQUE | |
| `password_hash` | TEXT | **hashed, never plain text** (SHA-256 over `salt:password`) |
| `salt` | TEXT | per-user random |
| `role` | TEXT | `Admin` \| `Engineer` \| `Viewer` |
| `active` | INTEGER | 0/1 |

**instruments** — mirrors the `Instrument` interface: tag, name, location (unit), type, criticality, commissioning date, running hours.
**maintenance_records** — mirrors `MaintenanceRecord`: instrument FK, dateTime, type (PM/CM), activity, final status, failure mode, repair/downtime hours, calibration before/after, technician, notes.
**settings** — single row; JSON columns for instrument types and interval rules, plus scalar thresholds.
**escalation_rules** — recipients per criticality.
**sessions** — server-side session records (JWT is stateless but this table lets Admins revoke).

## f. How Data Flows

1. **Auth** — the login form checks credentials against the local (client) auth store on every load; on Cloudflare it will use D1-backed server functions once you enable them (see migration status above). Sessions persist via `localStorage` today and via signed cookies once server auth is wired.
2. **First admin bootstrap** — on a completely empty install, `/auth` shows a one-time "Create Admin" form. This is disabled once at least one user exists.
3. **Client → Server → D1** (target architecture, schema is ready) — pages read via TanStack Query; server functions in `src/lib/*.functions.ts` execute in the Worker and query D1 via the `DB` binding.
4. **Backup / restore** — Settings → Export / Import JSON continues to work for the local UI store; treat it as a client-side backup only.

## g. Installation & Running Locally

**Prerequisites**: Node.js 20+ and npm 10+ (works identically on Ubuntu bash and Windows).

```bash
# install
npm install

# dev server (Vite on http://localhost:8080)
npm run dev

# production build
npm run build

# preview production build
npm run preview
```

For local D1 development (once you enable server functions against D1):

```bash
# create the DB locally
wrangler d1 execute reliability-dashboard --local --file=./migrations/0001_init.sql

# run the Worker locally with the D1 binding
wrangler dev
```

## h. Data Backup & Reset

- **Export**: Settings → Export JSON Backup (client-side data snapshot).
- **Import**: Settings → Import Backup.
- **Reset**: Settings → Reset (also wipes the local UI store).

## i. Troubleshooting

- **Locked out on first deploy** — open the deployed URL. If no users exist in D1, the login page automatically shows the "Create first Admin" form.
- **Port in use** — `npm run dev -- --port 3000`.
- **Blank screen after install** — hard refresh, then delete `node_modules` and reinstall.
- **Charts unreadable in dark mode** — chart colors are wired to CSS variables in `src/styles.css`; check that `<html>` has the `dark` class.
- **`wrangler d1 execute` says "database not found"** — the `database_id` in `wrangler.toml` was not updated after `wrangler d1 create`. Paste the new ID and rerun.

## j. Customization Notes

- **Logo** — replace `src/assets/pertamina-logo.png.asset.json` (Lovable CDN asset) or edit `AppShell.tsx` to import a different image.
- **Favicon** — replace `public/favicon.png` with the official Pertamina icon-only mark (16×16 / 32×32 optimized PNG or `.ico`), and adjust the `<link rel="icon">` in `src/routes/__root.tsx` if you use a different filename/extension.
- **Brand colors** — edit `--primary`, `--info`, `--success`, `--warning`, `--sce`, and `--chart-*` in `src/styles.css` (both `:root` and `.dark`).
- **Health thresholds / calibration intervals / escalation** — edit in-app on the Settings page.

---

## Deploying to Cloudflare

This is the full path from a fresh Cloudflare account to a working live app.

### 1. Prerequisites

- A Cloudflare account.
- Wrangler CLI installed and authenticated:
  ```bash
  npm install -g wrangler
  wrangler login
  ```

### 2. Create the D1 database

```bash
wrangler d1 create reliability-dashboard
```

Wrangler prints a `database_id`. Open `wrangler.toml` and paste it into the `[[d1_databases]]` block:

```toml
[[d1_databases]]
binding = "DB"
database_name = "reliability-dashboard"
database_id = "PASTE_YOUR_ID_HERE"
migrations_dir = "migrations"
```

### 3. Run the schema migration

Local (for `wrangler dev`):
```bash
wrangler d1 execute reliability-dashboard --local --file=./migrations/0001_init.sql
```

Remote (production D1):
```bash
wrangler d1 execute reliability-dashboard --remote --file=./migrations/0001_init.sql
```

### 4. Set secrets

Set a strong random session-signing secret:

```bash
wrangler secret put SESSION_SECRET
# paste a value from: openssl rand -hex 32
```

Any additional secrets (SMTP keys, etc.) are set the same way.

### 5. Deploy

**Option A — Direct CLI deploy (fastest first deploy):**

```bash
npm run build
wrangler deploy
```

The published URL is printed at the end.

**Option B — Git integration (recommended for ongoing work):**

1. Push the project to a GitHub repository.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Connect to Git**, pick the repo.
3. Set the build command to `npm run build` and framework preset to *None*.
4. In the project's **Settings → Bindings**, add a D1 binding named `DB` pointing at `reliability-dashboard`.
5. Add the `SESSION_SECRET` under **Settings → Variables and Secrets**.
6. Trigger the first deploy — subsequent pushes to the default branch auto-deploy.

### 6. First run after deploy

Because seed data was removed, the app starts empty and needs an initial account. Open the deployed URL — the login page detects the empty state and shows a **"Create first Admin"** form. Enter your name, email, and a password (≥8 chars). That first account is created with the `Admin` role and you're signed in.

To create additional accounts, sign in as the Admin and go directly to `/admin/users` (hidden from the sidebar by design).

### 7. Verify the deployment

- Open the deployed URL — login page renders.
- Create the first Admin, sign in — dashboard loads.
- Add an instrument via **Input Data** → refresh the page → the record persists.
- Log out from the user menu → login page reappears.
- Navigate to `/admin/users` as Admin → the page loads. Try as a non-admin → you're redirected to the dashboard.

### 8. Redeploying

- Git integration: `git push` — Cloudflare rebuilds and deploys.
- CLI: `npm run build && wrangler deploy`.

Schema changes: add a new file under `migrations/` (e.g. `0002_add_column.sql`) and run:

```bash
wrangler d1 execute reliability-dashboard --remote --file=./migrations/0002_add_column.sql
```
