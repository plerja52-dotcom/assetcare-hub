import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  LayoutDashboard,
  Wrench,
  History,
  Activity,
  Bell,
  FilePlus2,
  Settings as SettingsIcon,
  Info,
} from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & Guide — Pertamina Reliability Instrumentation" },
    ],
  }),
  component: HelpPage,
});

const sections = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard Overview",
    body: (
      <>
        <p>
          The one-glance summary of instrument reliability across Maintenance
          Area 2. Everything above is filterable by <strong>Unit</strong> and{" "}
          <strong>Criticality</strong>.
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <strong>Total Instruments</strong> — how many instruments match your
            filter.
          </li>
          <li>
            <strong>Availability</strong> — (operating hours − downtime hours) ÷
            operating hours × 100.
          </li>
          <li>
            <strong>MTBF</strong> (Mean Time Between Failures) — total operating
            days ÷ number of CM events.
          </li>
          <li>
            <strong>MTTR</strong> (Mean Time To Repair) — total repair hours ÷
            number of CM events.
          </li>
          <li>
            <strong>Overdue Calibrations</strong> — instruments past their
            calibration due date.
          </li>
          <li>
            <strong>PM/CM Ratio</strong> — share of preventive vs. corrective
            activities in the selected period.
          </li>
        </ul>
        <p className="mt-2">
          The four charts below break down the same data by activity split,
          per-unit workload, health distribution, and monthly trend.
        </p>
      </>
    ),
  },
  {
    id: "instruments",
    icon: Wrench,
    title: "Instruments",
    body: (
      <>
        <p>
          Master data for every instrument. Search by tag or name; filter by
          Unit, Type, or Criticality; click any row to open the details drawer
          showing history and next calibration.
        </p>
        <p className="mt-2">
          <strong>How to add an instrument:</strong> use the{" "}
          <em>Add Instrument</em> button (or go to <em>Input Data</em>) and
          complete Step 1 of the wizard.
        </p>
      </>
    ),
  },
  {
    id: "maintenance",
    icon: History,
    title: "Maintenance History",
    body: (
      <>
        <p>
          Complete PM/CM log with search, type, and status filters. Use{" "}
          <em>Export CSV</em> for offline reporting.
        </p>
        <p className="mt-2">
          <strong>How to log maintenance:</strong> go to <em>Input Data</em>,
          pick an existing instrument, and fill in Step 2. Or bulk-import via
          the file uploader (CSV / XLSX / DOCX supported).
        </p>
      </>
    ),
  },
  {
    id: "health",
    icon: Activity,
    title: "Health & Calibration",
    body: (
      <>
        <p>
          Traffic-light view — one card per instrument, colored green/yellow/red
          by Health Score.
        </p>
        <p className="mt-2">
          <strong>Health Score</strong> starts at 100 and is reduced by:
        </p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>−8 points for each corrective maintenance (CM) event</li>
          <li>
            Up to −30 points if calibration is overdue (proportional to days
            overdue)
          </li>
          <li>−5 points if calibration is due within 14 days</li>
          <li>
            −10 points if the last calibration deviation exceeds the tolerance
            set in Settings
          </li>
        </ul>
        <p className="mt-2">
          Bands: <strong>≥ 90 Excellent</strong>, <strong>≥ 70 Fair</strong>,{" "}
          <strong>&lt; 70 Poor</strong>. Thresholds are configurable in
          Settings.
        </p>
      </>
    ),
  },
  {
    id: "notifications",
    icon: Bell,
    title: "Notifications & Escalation",
    body: (
      <>
        <p>
          Active alerts for overdue calibrations, low health scores, and any
          issue on SCE- or High-criticality instruments. The right panel is the{" "}
          <strong>Escalation Matrix</strong> — the notification recipients per
          criticality tier; edit inline and it saves automatically.
        </p>
      </>
    ),
  },
  {
    id: "input",
    icon: FilePlus2,
    title: "Input Data",
    body: (
      <>
        <p>Two modes:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>
            <strong>Manual Entry</strong> — 2-step wizard. Step 1 picks or
            creates the instrument, Step 2 optionally adds a maintenance
            record.
          </li>
          <li>
            <strong>Import from File</strong> — drop a <code>.csv</code>,{" "}
            <code>.xlsx</code>, or <code>.docx</code> file. Rows are validated,
            errors are highlighted, and only valid rows are committed on
            confirmation. Download the CSV template for the exact column names.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "settings",
    icon: SettingsIcon,
    title: "Settings",
    body: (
      <>
        <p>
          Configure health-score thresholds, calibration tolerance, and PM /
          calibration intervals per instrument type. Also holds JSON backup
          export/import and a full reset button.
        </p>
      </>
    ),
  },
  {
    id: "admin",
    icon: Info,
    title: "Admins only — user management",
    body: (
      <>
        <p>
          Admin accounts can access user management at{" "}
          <code>/admin/users</code> (intentionally not in the sidebar). From
          there you can create Admin / Engineer / Viewer accounts, reset
          passwords, and deactivate users.
        </p>
      </>
    ),
  },
];

function HelpPage() {
  return (
    <AppShell>
      <PageHeader
        title="Help & Guide"
        description="How to use each page of the dashboard, and how the numbers are calculated."
      />

      <Card>
        <CardContent className="p-4 md:p-6">
          <Accordion type="multiple" defaultValue={["dashboard"]} className="w-full">
            {sections.map((s) => {
              const Icon = s.icon;
              return (
                <AccordionItem key={s.id} value={s.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <span className="flex items-center gap-2.5 text-left">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{s.title}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pl-6">
                    {s.body}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </AppShell>
  );
}
