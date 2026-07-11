import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard, PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { computeKPIs, healthBand, healthScore } from "@/lib/kpi";
import {
  Wrench,
  Activity,
  Timer,
  Clock,
  AlertTriangle,
  PieChart as PieIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const chartColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ChartTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md text-popover-foreground">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color || p.payload?.fill }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { instruments, maintenance, settings } = useAppStore();
  const [unit, setUnit] = useState<string>("all");
  const [criticality, setCriticality] = useState<string>("all");

  const filters = useMemo(
    () => ({
      unit: unit === "all" ? undefined : unit,
      criticality: criticality === "all" ? undefined : criticality,
    }),
    [unit, criticality],
  );

  const kpis = useMemo(
    () => computeKPIs(instruments, maintenance, settings, filters),
    [instruments, maintenance, settings, filters],
  );

  const pmCmData = [
    { name: "Preventive", value: kpis.pmRatio, key: "PM" },
    { name: "Corrective", value: kpis.cmRatio, key: "CM" },
  ];

  const perUnit = useMemo(() => {
    const map = new Map<string, number>();
    maintenance.forEach((m) => {
      const ins = instruments.find((i) => i.id === m.instrumentId);
      if (!ins) return;
      if (filters.unit && ins.location !== filters.unit) return;
      if (filters.criticality && ins.criticality !== filters.criticality) return;
      map.set(ins.location, (map.get(ins.location) ?? 0) + 1);
    });
    return Array.from(map, ([unit, count]) => ({ unit, count }));
  }, [instruments, maintenance, filters]);

  const healthData = useMemo(() => {
    const counts = { Excellent: 0, Fair: 0, Poor: 0 };
    instruments
      .filter(
        (i) =>
          (!filters.unit || i.location === filters.unit) &&
          (!filters.criticality || i.criticality === filters.criticality),
      )
      .forEach((i) => {
        const s = healthScore(i, maintenance, settings);
        counts[healthBand(s, settings)]++;
      });
    return [
      { name: "Excellent", value: counts.Excellent, fill: "var(--success)" },
      { name: "Fair", value: counts.Fair, fill: "var(--warning)" },
      { name: "Poor", value: counts.Poor, fill: "var(--primary)" },
    ];
  }, [instruments, maintenance, settings, filters]);

  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const months: { month: string; count: number; downtime: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      });
      const monthRecs = maintenance.filter((m) => {
        const md = new Date(m.dateTime);
        return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear();
      });
      months.push({
        month: label,
        count: monthRecs.length,
        downtime: monthRecs.reduce((s, r) => s + (r.downtimeHours ?? 0), 0),
      });
    }
    return months;
  }, [maintenance]);

  const units = Array.from(new Set(instruments.map((i) => i.location))).sort();

  return (
    <AppShell>
      <PageHeader
        title="Dashboard Overview"
        description="Live reliability metrics across Maintenance Area 2 instruments."
        actions={
          <>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Unit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                {units.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={criticality} onValueChange={setCriticality}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Criticality" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Criticality</SelectItem>
                <SelectItem value="SCE">SCE</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <KpiCard label="Total Instruments" value={kpis.totalInstruments} icon={Wrench} accent="info" trend={kpis.trend.mtbf} />
        <KpiCard label="Availability" value={kpis.availability} suffix="%" icon={Activity} accent="success" trend={kpis.trend.availability} />
        <KpiCard label="MTBF" value={kpis.mtbfDays} suffix="days" icon={Timer} accent="info" trend={kpis.trend.mtbf} />
        <KpiCard label="MTTR" value={kpis.mttrHours} suffix="hrs" icon={Clock} accent="warning" trend={kpis.trend.mttr} />
        <KpiCard label="Overdue Calibrations" value={kpis.overdueCalibrations} icon={AlertTriangle} accent="primary" trend={kpis.trend.overdue} />
        <KpiCard label="PM vs CM Ratio" value={`${kpis.pmRatio}/${kpis.cmRatio}`} suffix="%" icon={PieIcon} accent="sce" />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">PM vs CM Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pmCmData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {pmCmData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "var(--info)" : "var(--primary)"} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Maintenance Activity per Unit</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perUnit}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="unit" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Health Score Distribution</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={healthData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {healthData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Monthly Maintenance & Downtime Trend</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }} />
                <Line type="monotone" dataKey="count" name="Activities" stroke="var(--chart-2)" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="downtime" name="Downtime (hrs)" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
