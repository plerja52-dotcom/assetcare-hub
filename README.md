# Pertamina Reliability Instrumentation Dashboard

A PM & PdM tracking dashboard for **Maintenance Area 2, PT Kilang Pertamina Internasional RU VI Balongan**. Built for reliability engineers who need to see, at a glance, which preventive/predictive maintenance tasks are done, in-progress, or behind — per Area and per Equipment type — grounded in the real spreadsheet layout the team already uses.

## Stack

- **TanStack Start v1** (React 19 + Vite 7), file-based routing under `src/routes/`.
- **Tailwind CSS v4** with a "liquid glass" design system in `src/styles.css`.
- **Zustand** for client state (persisted to `localStorage` today; D1 wiring described below).
- **Cloudflare Workers** deploy target (`wrangler.toml`, entry `src/server.ts`).
- **D1** schema in `migrations/` — production data source once wired.

## Data model

```
Instrument
  tagNumber (unique)     e.g. "12-JS-007"
  area                    "12" | "14" | "22" | "AHU" | "HTU" | "DHC" | ...
  equipmentType           "Junction Box" | "Control Valve" | "Transmitter" | ...
  lokasi (optional)       descriptive location
  pmFrequency             { count, unit: minggu|bulan|tahun }
  createdBy, createdAt

PmTaskRecord
  tagNumber, area, equipmentType   (from instrument)
  period (optional)                  W1..W4
  planDate, actualDate               ISO date
  pic                                person in charge
  activity, activityType             activityType: PM | PdM | Perbaikan
  kendala, perbaikanLanjutan, catatan
  status                              Finish | Inprogress | Behind | Scheduled
  createdBy, createdAt
```

Fields intentionally **removed** from earlier revisions: `criticality`, `runningHours`, health-score, calibration tolerance / before / after, failure mode, repair time, downtime, MTBF, MTTR, Availability. None of them exist in the real team files.

## Pages

- **Dashboard** — Total Instrument, Progress PM Bulan Ini %, Pekerjaan Selesai, Pekerjaan Overdue, Progress per Area (bar), Distribusi Jenis Instrument (donut), Daftar Pekerjaan Akan Jatuh Tempo (upcoming/overdue table). Filters: Area, Equipment Type.
- **Instruments** — master list with delete (cascades related PM tasks after a confirm-with-count dialog).
- **Maintenance History** — new columns (Tag, Area, Equipment, Period, Plan, Actual, PIC, Activity, Type, Status, Kendala, Perbaikan Lanjutan, Catatan). Filters + CSV export + per-row delete.
- **PM Status** (was "Health & Calibration") — traffic-light card per instrument based on its latest task: green=Finish, yellow=Inprogress, red=Behind, grey=Scheduled.
- **Notifications** — every task currently `Behind`, grouped by Area, with escalation recipients configured per Area.
- **Input Data** — manual Instrument form, manual PM Task form, Smart Import.
- **Settings** — Areas & Equipment lists, PM Frequency per equipment type, Escalation per Area, Dashboard upcoming-window, Backup & Reset (Admin-only).
- **Help & Guide** — bilingual (English / Bahasa Indonesia), toggle persists.
- **Auth** — one-time Admin bootstrap (based on `users.length === 0`, not a resettable flag), regular sign-in, and a public `/register` page for self-registration.
- **Admin → User Management** — Users, Pending Requests (approve/reject), Sessions (view + revoke).

## Status derivation

- `actualDate` filled → **Finish**
- No `actualDate`, `planDate` in the past → **Behind**
- Manually flagged → **Inprogress**
- Otherwise → **Scheduled**

Auto-recomputed on every task change and on store rehydrate.

## Registration & approval (no email / OTP)

Self-registration creates a `status = pending`, `role = User`, `active = false` account. An Admin approves or rejects it from **User Management → Pending Requests**. Login of a pending account shows "awaiting Admin approval"; rejected accounts see "not approved, contact your Admin". No email verification is needed for this round — it's a pure Admin approval flow.

## Security posture (what's implemented vs. what needs a live deploy)

Implemented in this round:
- PBKDF2-SHA256 (120,000 iterations, per-user random salt) password hashing — replaces the earlier single-round SHA-256.
- Session records with login/last-active timestamps and Admin revoke.
- No password hashes ever leave the store; the login flow compares hashes only.
- Migration schema for a `users.status` column and a dedicated `sessions` table.

Structurally scaffolded, activates once you deploy with D1:
- Move credential verification server-side (`src/routes/api/auth/*`) hitting D1 via the `DB` binding, so the client only ever POSTs email+password and receives an HttpOnly Secure SameSite=Strict session cookie.
- Rate-limit login and register endpoints (requires a KV or Durable Object binding — D1 alone is a poor fit for counters).
- CSP / X-Frame-Options / X-Content-Type-Options headers via `wrangler.toml` or in `src/server.ts`.
- Parameterized SQL everywhere (D1 uses `?` placeholders; there is no string concatenation in the migration or planned handlers).

## Liquid glass — where to see it

After this round the following surfaces have visible frosted-glass treatment (backdrop blur, translucent tint, top highlight, layered shadow):

- Top navbar (scroll page content behind it to see the blur).
- Sidebar (both desktop and mobile drawer).
- All main-content Cards (`glass-panel` class).
- Popovers, dropdowns, dialogs, sheets, tabs list.
- Auth and Register cards.

Motion:
- Dropdown/dialog open uses a spring easing (`cubic-bezier(0.16,1,0.3,1)`).
- Cards lift on hover (`hover:-translate-y-0.5 hover:shadow-lg`).
- Theme toggle crossfade on `body` (`transition: background-color 320ms ease`).
- Respects `prefers-reduced-motion` — disables blur and transitions.

## Smart Import

- Accepts CSV and Excel (`.xlsx` / `.xls`).
- Auto-detects the real header row in the first ~20 rows (real files put report titles at the top).
- Fuzzy alias matching for the new fields:
  - `tagNumber` ← Tag Number, Tag. Number, No Tag, Nomor Tag
  - `lokasi` ← Lokasi, Location
  - `area` ← Area
  - `equipmentType` ← Equipment, Jenis, Tipe
  - `planDate` ← Plan
  - `actualDate` ← Actual
  - `pic` ← PIC, Pelaksana
  - `activity` ← Activity, Aktivitas, Pekerjaan, Job Description, Work Done
  - `kendala` ← Kendala
  - `status` ← Status (maps Finish/Selesai, Inprogress/Sedang Dikerjakan, Behind/Terlambat/Overdue)
  - `perbaikanLanjutan` ← Perbaikan Lanjutan
  - `catatan` ← Ket, REMARK, Catatan, Notes
- **Ignores** `No.`, `Evidence`, sign-off/initial columns (`P`, `K`, `MA II`, `WS`, `EIE`, `HSE`, `PE`).
- Detects and skips non-record sheets (summary/rekap sheets and task-list/checklist templates) with a clear reason.
- **Two downloadable XLSX templates** on the Input Data page — `Download Instrument Template` and `Download PM Task Template` — with styled headers and greyed example rows that mirror the team's tracker format.

## Deploying to Cloudflare

```bash
# 1. Install & authenticate
npm i -g wrangler
wrangler login

# 2. Provision D1
wrangler d1 create reliability-dashboard
#   → paste the returned database_id into wrangler.toml

# 3. Run migrations
wrangler d1 execute reliability-dashboard --local  --file=./migrations/0001_init.sql
wrangler d1 execute reliability-dashboard --local  --file=./migrations/0002_new_model.sql
wrangler d1 execute reliability-dashboard --remote --file=./migrations/0001_init.sql
wrangler d1 execute reliability-dashboard --remote --file=./migrations/0002_new_model.sql

# 4. Session secret (server-side auth cutover)
wrangler secret put SESSION_SECRET     # any 32+ char random string

# 5. Build & deploy
bun run build
wrangler deploy
```

First-Admin bootstrap: the very first `/auth` visit against a fresh database shows the "Create first Admin" form. Once at least one user exists, that form permanently disappears (it's gated by an actual user-count check, not a flag). Once the server-side auth routes are cut over, the same check runs as `SELECT COUNT(*) FROM users`.

## Where to change common things

- **Brand icon** — `src/assets/pertamina-icon.png.asset.json`
- **Colors / glass tokens** — `src/styles.css` (`:root` and `.dark`)
- **Default Area / Equipment / PM frequency** — `src/lib/seed.ts`
- **Upcoming-window default** — `src/lib/seed.ts` (`upcomingWindowDays: 14`)
- **Status derivation** — `src/lib/kpi.ts` (`deriveStatus`)
- **KPI computations** — `src/lib/kpi.ts` (`computeKPIs`, `progressByArea`, `dueSoonList`)
- **Smart Import aliases** — `src/lib/smart-import.ts` (`ALIASES`, `IGNORE_HEADERS`)
- **Downloadable templates** — `src/lib/templates.ts`

## Round 4 changelog (high level)

Data model rewrite; new dashboard KPIs; PM Status page (renamed from Health & Calibration); status derivation logic; Settings overhaul (Areas / Equipment / PM Frequency / Escalation-per-Area); registration + approval flow; PBKDF2 password hashing; session records + Admin revoke; `createdBy` audit field on Instruments and PM Tasks; delete for instruments (cascade) and tasks; bilingual Help & Guide rewrite in natural Bahasa Indonesia; Smart Import alias rework + two XLSX templates; visible liquid-glass pass with real backdrop blur, translucent tints, top highlights, layered shadows, spring motion, hover lift, theme crossfade; logo/wordmark vertical alignment fix.
