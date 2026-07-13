# Pertamina Reliability Instrumentation

Preventive Maintenance (PM) and Corrective Maintenance (CM) tracking for instruments in **Maintenance Area 2, PT Kilang Pertamina Internasional RU VI Balongan**.

Modern, browser-based dashboard built with React + TanStack Start, deployable to **Cloudflare Workers** with **D1** as the database.

---

## a. Project Overview

Helps maintenance & reliability engineers in Area 2 track instrument health, calibration schedules, PM/CM history, and reliability KPIs (Availability, MTBF, MTTR) — replacing scattered Word/Excel logs with a live dashboard. Multi-user with authentication so different engineers share the same data.

## b. Feature List

**Pages**
- **Login** (`/auth`) — clean, on-brand sign-in. On a fresh install, the first person prompted to create the initial **Admin** account (bootstrap).
- **Dashboard Overview** — KPIs, PM vs CM donut, per-unit bar chart, health distribution, monthly trend, unit/criticality filters. Red is reserved for genuinely critical states.
- **Instruments** — searchable/filterable table + detail drawer with history and next calibration.
- **Maintenance History** — full PM/CM log with filters and CSV export.
- **Health & Calibration** — traffic-light grid; overdue / due-soon warnings.
- **Notifications & Escalation** — active alerts + editable escalation matrix.
- **Input Data** — Manual Entry (2-step wizard) + **Smart Import** (see below).
- **Settings** — tabbed: Health Scoring, PM & Calibration Intervals, Escalation Matrix, Backup & Reset.
- **Help & Guide** (`/help`) — built-in user guide with **live English / Indonesian language switch** and a persisted preference.
- **User Management** (`/admin/users`, hidden) — reachable only from the Admin profile dropdown, not the sidebar.

**Empty states.** Ships with no seed data — every page renders a tidy empty state with a clear next action.

**KPI formulas (plain language)**
- **Availability** = (operating hours − downtime hours) ÷ operating hours × 100
- **MTBF** = total operating days ÷ number of CM events
- **MTTR** = total repair hours ÷ number of CM events
- **PM/CM Ratio** = PM count ÷ total (and CM count ÷ total)
- **Health Score** starts at 100, −8 per CM, up to −30 for overdue calibration (proportional to days overdue), −5 if due within 14 days, −10 if last calibration deviation exceeds tolerance. Bands: ≥90 Excellent, ≥70 Fair, <70 Poor.

## Roles & Permissions

Exactly two roles: **Admin** and **User**.

| Capability | Admin | User |
|---|---|---|
| Dashboard, Instruments, Maintenance, Health, Notifications | ✅ | ✅ |
| Input Data (manual + Smart Import) | ✅ | ✅ |
| Help & Guide (with EN/ID switch) | ✅ | ✅ |
| Settings → Health Scoring, PM/Calibration Intervals, Escalation | ✅ (edit) | ✅ (edit) |
| Settings → **Backup & Reset** (Export / Import / Reset) | ✅ | ❌ disabled with "Admin only" |
| User Management (`/admin/users`, profile menu entry) | ✅ | ❌ hidden + route redirect |

Non-Admins who try `/admin/users` directly are redirected to the Dashboard with no flash of admin content.

## c. Tech Stack

- **React 19 + Vite 7 + TanStack Start** (file-based routing, SSR-ready)
- **TanStack Query** — data cache
- **Tailwind CSS v4** — design tokens in `src/styles.css`
- **shadcn/ui + Radix UI** — accessible components
- **Recharts** — theme-aware charts
- **Zustand + persist** — client UI state
- **PapaParse / xlsx / mammoth / sonner** — file parsing + toasts
- **Cloudflare Workers + D1** — deploy target and database

### Design system

- **Split brand**: the Pertamina icon (PNG with transparent background) is used alone in the header and as favicon. The **"PERTAMINA" wordmark is rendered as real HTML text** in Poppins ExtraBold — no baked-in colors, fully theme-aware, no washed-out logo bug.
- **Liquid-glass surfaces**: navbar, sidebar, dropdowns, modals, and Settings tabs use frosted-glass backgrounds (`backdrop-filter: blur + saturate`, soft 1px highlight, layered shadows). Automatically flattened when the user has `prefers-reduced-motion` enabled.
- **Smooth theme transitions**: background / colors ease over 300 ms so light↔dark toggling doesn't hard-cut.

## d. Project / Folder Structure

```
migrations/
└── 0001_init.sql             # D1 schema (users, instruments, maintenance, settings, sessions)
public/
└── favicon.png               # Pertamina icon-only mark
src/
├── assets/                   # CDN asset pointers (Pertamina icon)
├── components/
│   ├── ui/                   # shadcn/ui primitives
│   ├── layout/AppShell.tsx   # navbar + sidebar + user menu + drawer (liquid glass)
│   ├── brand.tsx             # split brand: icon + real-text PERTAMINA wordmark
│   ├── badges.tsx
│   ├── empty-state.tsx
│   └── kpi-card.tsx
├── lib/
│   ├── auth-store.ts         # session + role (Admin/User) + password hashing
│   ├── smart-import.ts       # fuzzy header mapping + auto record-type detection
│   ├── types.ts
│   ├── store.ts
│   ├── seed.ts               # empty seed + default Settings
│   ├── kpi.ts
│   ├── theme.tsx             # theme provider + blocking init script (no flicker)
│   └── utils.ts
├── routes/
│   ├── __root.tsx            # Providers, meta, favicon, theme init script, auth gate
│   ├── auth.tsx              # Login + first-admin bootstrap
│   ├── index.tsx             # Dashboard
│   ├── instruments.tsx
│   ├── maintenance.tsx
│   ├── health.tsx
│   ├── notifications.tsx
│   ├── input.tsx             # Manual + Smart Import
│   ├── help.tsx              # Bilingual EN/ID Help & Guide
│   ├── settings.tsx          # Tabs: Health / Intervals / Escalation / Backup & Reset
│   └── admin.users.tsx       # HIDDEN — /admin/users, Admin only
├── server.ts                 # Worker fetch entry
└── styles.css                # Tailwind + tokens (light/dark) + liquid-glass utilities
wrangler.toml                 # Cloudflare Worker + D1 binding
```

## e. Data Model

**users** (D1) — `id`, `name`, `email` (unique), `password_hash`, `salt`, `role` ∈ {`Admin`, `User`}, `active`, `created_at`. Password is SHA-256 over `salt:password`.

**instruments** — tag, name, location, type, criticality (High/Medium/Low/SCE), commissioning date, running hours.
**maintenance_records** — instrument FK, dateTime, type (PM/CM), activity, final status, failure mode, repair/downtime hours, calibration before/after, technician, notes.
**settings** — single row; JSON columns for instrument types and interval rules, plus scalar thresholds.
**escalation_rules** — recipients per criticality.
**sessions** — server-side revocable session records.

## f. How Data Flows

1. **Auth** — client-side auth store today; will move to D1-backed server functions with signed-cookie sessions once wired.
2. **First-admin bootstrap** — on an empty install, `/auth` shows a one-time "Create Admin" form.
3. **Client → Server → D1** (target) — pages read via TanStack Query; server functions in `src/lib/*.functions.ts` query D1 via the `DB` binding.
4. **Backup / restore** — Settings → Backup & Reset (Admin only).

## Smart Import

Import from CSV, XLSX, or DOCX **without** matching a template:

- **Fuzzy column detection** — aliases like *Tag / Tag Number / Asset Tag / Instrument Tag* all map to `tagNumber`; *Location / Unit / Area* map to `location`; PM/CM columns accept *"Preventive" / "Corrective"*, and so on. Matching is case- and punctuation-insensitive.
- **Automatic record-type detection** — files are classified as either **Instrument master data** or **Maintenance records** based on which fields are present. You can override the guess.
- **Mapping confirmation step** — after auto-detection you see a table of *file column → system field* with dropdowns to correct any mismatch or mark a column *Ignore*.
- **Forgiving validation** — only truly required fields (tag + name for instruments; tag + date + PM/CM type for maintenance) can invalidate a row. Extra/unknown columns are ignored, not rejected.
- **DOCX tables** get the same fuzzy logic as spreadsheets.
- (Optional stretch — not yet wired) Cloudflare Workers AI could be used as a low-confidence fallback for ambiguous headers; the heuristic works standalone.

The template CSV is still downloadable from the Smart Import panel for anyone who wants a guaranteed layout.

## g. Installation & Running Locally

Prerequisites: Node.js 20+, npm 10+ (Ubuntu bash and Windows both work).

```bash
npm install
npm run dev      # http://localhost:8080
npm run build
npm run preview
```

For local D1 development:

```bash
wrangler d1 execute reliability-dashboard --local --file=./migrations/0001_init.sql
wrangler dev
```

## h. Data Backup & Reset

Settings → **Backup & Reset** (Admin only): Export JSON, Import JSON, Reset. Shows the timestamp of the last local export.

## i. Troubleshooting

- **Locked out on first deploy** — open the deployed URL; if no users exist, `/auth` automatically shows the "Create first Admin" form.
- **Theme flips on its own** — fixed in v1.2: a blocking `<head>` script now applies the persisted theme before hydration, and no OS `prefers-color-scheme` listener overrides your manual choice.
- **Charts unreadable in dark mode** — chart colors are wired to CSS variables in `src/styles.css`.
- **`wrangler d1 execute` says "database not found"** — the `database_id` in `wrangler.toml` was not updated after `wrangler d1 create`.

## j. Customization Notes

- **Icon / favicon** — replace `src/assets/pertamina-icon.png.asset.json` (Lovable CDN pointer) and/or `public/favicon.png`.
- **Wordmark** — real HTML text in `src/components/brand.tsx`; change the font by editing `--font-brand` in `src/styles.css`.
- **Brand colors / chart palette** — edit `--primary`, `--info`, `--success`, `--warning`, `--sce`, `--chart-*` in `src/styles.css` (both `:root` and `.dark`).
- **Liquid-glass strength** — tune `--glass-bg`, `--glass-border`, `--glass-shadow` in `src/styles.css`.
- **Health thresholds / intervals / escalation** — Settings page in-app.

---

## Deploying to Cloudflare

### 1. Prerequisites

```bash
npm install -g wrangler
wrangler login
```

### 2. Create the D1 database

```bash
wrangler d1 create reliability-dashboard
```

Paste the printed `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "reliability-dashboard"
database_id = "PASTE_YOUR_ID_HERE"
migrations_dir = "migrations"
```

### 3. Run the schema migration

```bash
wrangler d1 execute reliability-dashboard --local  --file=./migrations/0001_init.sql
wrangler d1 execute reliability-dashboard --remote --file=./migrations/0001_init.sql
```

### 4. Set secrets

```bash
wrangler secret put SESSION_SECRET   # value: openssl rand -hex 32
```

### 5. Deploy

CLI:
```bash
npm run build
wrangler deploy
```

Git integration (recommended for ongoing work): connect the repo in **Workers & Pages → Create → Connect to Git**, set build command `npm run build`, framework preset *None*, add the `DB` binding and `SESSION_SECRET` under Settings.

### 6. First run

Open the deployed URL — the login page detects the empty database and shows **"Create first Admin"**. Sign in as Admin, then create additional accounts from the profile menu → **User Management** (or `/admin/users`).

### 7. Verify

- Login page renders; first-Admin bootstrap works on empty install.
- Dark-mode toggle: icon full-color, "PERTAMINA" wordmark legible, no flashes, theme persists across navigation and reload.
- Admin: can edit every Settings tab and use Backup & Reset; sees **User Management** in profile menu.
- User: can edit Health / Intervals / Escalation; Backup & Reset controls are disabled ("Admin only" tooltip); User Management item hidden and route redirects.
- Smart Import: upload a CSV/XLSX with renamed headers → mapping is auto-guessed and adjustable.
- `wrangler.toml` and `migrations/0001_init.sql` use only the `Admin` / `User` roles — no `Engineer` / `Viewer` leftovers.

### 8. Redeploying

- Git: `git push`.
- CLI: `npm run build && wrangler deploy`.
- Schema changes: add `migrations/000N_*.sql` and rerun the `wrangler d1 execute … --remote` step.
