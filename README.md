# Reliability Instrumentation Dashboard

Preventive Maintenance (PM) and Corrective Maintenance (CM) tracking for instruments in **Maintenance Area 2, PT Kilang Pertamina Internasional RU VI Balongan**.

A modern, browser-based SaaS-style dashboard built with React + Vite. All data lives in the browser (localStorage) — no server required.

## a. Project Overview

This app helps maintenance & reliability engineers in Area 2 track instrument health, calibration schedules, PM/CM history, and reliability KPIs (Availability, MTBF, MTTR) in one place — replacing scattered Word/Excel logs with a live dashboard.

## b. Feature List

**Pages**
- **Dashboard Overview** — KPIs (Total Instruments, Availability, MTBF, MTTR, Overdue Calibrations, PM/CM ratio), PM vs CM donut, per-unit bar chart, health score distribution, monthly trend line, global filters (unit, criticality).
- **Instrument Master Data** — searchable/filterable/paginated table of instruments, criticality badges, detail drawer showing history + next calibration.
- **Maintenance History** — full PM/CM log with filters and CSV export.
- **Health Scoring & Calibration** — traffic-light card grid, early-warning highlight for overdue / due-soon calibrations.
- **Notifications & Escalation** — active alerts + editable escalation matrix.
- **Settings** — health thresholds, calibration tolerance, PM/calibration intervals per instrument type, JSON backup export/import, reset to seed.
- **Input Data** — two tabs:
  - **Manual Entry** — 2-step wizard, real-time validation, dropdowns.
  - **Import from File** — drag & drop `.csv`, `.xlsx`, `.docx`; downloadable template; preview with error highlighting before commit.

**KPI formulas (plain language)**
- **Availability** = (total operating hours − total downtime hours) ÷ total operating hours × 100
- **MTBF** (Mean Time Between Failures) = total instrument operating days ÷ number of CM events
- **MTTR** (Mean Time To Repair) = total repair hours ÷ number of CM events
- **PM/CM Ratio** = PM count ÷ total maintenance count (and CM count ÷ total)
- **Health Score** = starts at 100, minus 8 per CM event, minus a penalty proportional to how many days a calibration is overdue, minus 10 if the last calibration deviation exceeds the tolerance threshold. Bands: ≥90 Excellent (green), ≥70 Fair (yellow), <70 Poor (red).

## c. Tech Stack

- **React 19 + Vite 7** — UI + build tool.
- **TanStack Router + TanStack Start** — file-based routing.
- **TanStack Query** — async caching (wired for future use).
- **Tailwind CSS v4** — styling via design tokens in `src/styles.css`.
- **shadcn/ui + Radix UI** — accessible base components.
- **Recharts** — charts (theme-aware via CSS variables).
- **Lucide** — icon set.
- **Zustand + persist middleware** — global state persisted to `localStorage`.
- **PapaParse** — CSV parsing.
- **xlsx (SheetJS)** — Excel parsing.
- **mammoth** — extract tables from `.docx`.
- **sonner** — toast notifications.

## d. Project / Folder Structure

```
src/
├── assets/                 # CDN asset pointers (Pertamina logo)
├── components/
│   ├── ui/                 # shadcn/ui primitives
│   ├── layout/AppShell.tsx # navbar + sidebar + mobile drawer
│   ├── badges.tsx          # Criticality/Status/Type/Health badges
│   └── kpi-card.tsx        # KPI card + PageHeader
├── lib/
│   ├── types.ts            # Data model (Instrument, MaintenanceRecord, Settings)
│   ├── store.ts            # Zustand store persisted to localStorage
│   ├── seed.ts             # Seed data + default settings
│   ├── kpi.ts              # Calculations (Availability, MTBF, MTTR, health)
│   ├── theme.tsx           # Light/dark theme provider
│   └── utils.ts            # `cn` helper
├── routes/
│   ├── __root.tsx          # Root shell, providers, meta
│   ├── index.tsx           # Dashboard
│   ├── instruments.tsx
│   ├── maintenance.tsx
│   ├── health.tsx
│   ├── notifications.tsx
│   ├── settings.tsx
│   └── input.tsx           # Manual + file import
├── types/mammoth.d.ts      # Type shim
└── styles.css              # Tailwind + Pertamina design tokens (light/dark)
```

Key files:
- **`src/lib/types.ts`** — canonical data model.
- **`src/lib/store.ts`** — localStorage persistence via Zustand.
- **`src/lib/kpi.ts`** — all KPI + health calculations.
- **`src/routes/input.tsx`** — CSV/Excel/Word parsing & preview.

## e. Data Model

**Instrument** (`src/lib/types.ts`)
| Field | Type | Required |
|---|---|---|
| `id` | string | ✓ |
| `tagNumber` | string (unique) | ✓ |
| `name` | string | ✓ |
| `location` | string (unit) | ✓ |
| `type` | string | ✓ |
| `criticality` | `High \| Medium \| Low \| SCE` | ✓ |
| `commissioningDate` | ISO date | optional |
| `runningHours` | number | optional |

**MaintenanceRecord**
| Field | Type | Required |
|---|---|---|
| `id` | string | ✓ |
| `instrumentId` | string (FK) | ✓ |
| `tagNumber` | string | ✓ |
| `dateTime` | ISO datetime | ✓ |
| `type` | `PM \| CM` | ✓ |
| `activity` | string | ✓ |
| `finalStatus` | `Online/Normal \| Calibration Due \| Maintenance Required \| Draft` | ✓ |
| `failureMode` | string | CM only |
| `repairTimeHours` | number | optional |
| `downtimeHours` | number | optional |
| `calibrationBefore` | number (%) | optional |
| `calibrationAfter` | number (%) | optional |
| `technician` | string | ✓ |
| `notes` | string | optional |

**Settings** — instrument types, PM/calibration intervals per type, calibration tolerance %, health score bands, escalation matrix.

## f. How Data Flows

1. **Storage** — Zustand store persists to `localStorage` under key `rid-store-v1`. Everything is client-side.
2. **Manual Entry** — Step 1 picks/creates an instrument (validates duplicate tag). Step 2 optionally adds a maintenance record. On save, the store updates and every KPI/chart re-renders reactively.
3. **File Import** — file dropped → parsed (Papa/XLSX/Mammoth) → normalized → validated (required fields, duplicate tags, valid criticality) → preview table shows valid/invalid rows → **Import Now** commits only valid rows.
4. **Backup** — Settings › Export exports a single JSON file containing instruments, maintenance, and settings. Import restores it. Reset wipes back to seed.
5. **Recalculation** — KPIs, health scores, and next-calibration dates are computed on the fly from current store state — no cache to invalidate.

## g. Installation & Running Locally

**Prerequisites**: Node.js 20+ and npm 10+ (works identically on Ubuntu bash and Windows PowerShell/CMD).

```bash
# 1. install
npm install

# 2. dev server (http://localhost:5173 or 8080)
npm run dev

# 3. production build
npm run build

# 4. preview production build
npm run preview
```

Commands are identical on Ubuntu and Windows. No OS-specific scripts.

## h. Data Backup & Reset

- **Export**: Settings → *Export JSON Backup*.
- **Import**: Settings → *Import Backup* → select the JSON file.
- **Reset**: Settings → *Reset to Seed Data* (or clear `localStorage` for the site).

## i. Troubleshooting

- **Port already in use** — change with `npm run dev -- --port 3000`.
- **Node version mismatch** — install Node.js ≥ 20 (`node -v`).
- **File import shows all rows invalid** — download the CSV template and ensure column headers match (`Tag Number, Name, Location, Type, Criticality, Commissioning Date`).
- **Blank screen after install** — hard refresh (Ctrl/Cmd+Shift+R), or delete `node_modules` and re-`npm install`.
- **Charts unreadable in dark mode** — chart colors are wired to CSS variables; check that `<html>` has the `dark` class.

## j. Customization Notes

- **Logo** — replace `src/assets/pertamina-logo.png.asset.json` or edit `AppShell.tsx` to import a different image.
- **Brand colors** — edit `--primary` and chart tokens in `src/styles.css` (both `:root` and `.dark`).
- **Health thresholds / calibration intervals / escalation** — edit in-app via the Settings page (persisted per browser); defaults live in `src/lib/seed.ts`.
