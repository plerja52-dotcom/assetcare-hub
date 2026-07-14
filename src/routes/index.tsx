import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { KpiCard } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import {
  computeKPIs, progressByArea, equipmentDistribution, dueSoonList, STATUS_COLORS,
} from "@/lib/kpi";
import {
  Wrench, CheckCircle2, AlertTriangle, TrendingUp, Plus, CalendarClock, BarChart3, PieChart as PieIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, LabelList,
} from "recharts";
import { useMemo, useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { TaskStatusBadge, AreaBadge } from "@/components/badges";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({ component: DashboardPage });

const PIE_COLORS = [
  "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
  "var(--chart-5)", "var(--chart-1)", "var(--info)", "var(--success)",
];

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md text-popover-foreground">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{p.value}{p.dataKey === "pct" ? "%" : ""}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardPage() {
  const { instruments, tasks, settings } = useAppStore();
  const [area, setArea] = useState<string>("all");
  const [equip, setEquip] = useState<string>("all");

  const filters = useMemo(() => ({
    area: area === "all" ? undefined : area,
    equipmentType: equip === "all" ? undefined : equip,
  }), [area, equip]);

  const kpis = useMemo(() => computeKPIs(instruments, tasks, settings, filters), [instruments, tasks, settings, filters]);
  const areaBars = useMemo(() => progressByArea(tasks, filters), [tasks, filters]);
  const equipPie = useMemo(() => equipmentDistribution(instruments, filters), [instruments, filters]);
  const dueSoon = useMemo(() => dueSoonList(tasks, settings, filters).slice(0, 12), [tasks, settings, filters]);

  const hasInstruments = instruments.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="Dashboard Overview"
        description="PM & PdM progress across Maintenance Area 2 instruments."
        actions={
          <>
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {settings.areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={equip} onValueChange={setEquip}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Equipment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Equipment</SelectItem>
                {settings.equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      {!hasInstruments && (
        <Card className="mb-6 glass-panel border-0">
          <CardContent className="p-0">
            <EmptyState
              icon={Wrench}
              title="No instruments yet"
              description="Add your first instrument or import the team's existing PM tracker to start monitoring progress."
              action={
                <Button asChild>
                  <Link to="/input"><Plus className="h-4 w-4 mr-1" />Add Instrument</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Instrument" value={kpis.totalInstruments} icon={Wrench} accent="info" />
        <KpiCard label="Progress PM Bulan Ini" value={kpis.progressThisMonthPct} suffix="%" icon={TrendingUp} accent="success" />
        <KpiCard label="Pekerjaan Selesai (bulan ini)" value={kpis.finishedThisMonth} icon={CheckCircle2} accent="success" />
        <KpiCard label="Pekerjaan Overdue" value={kpis.overdueCount} icon={AlertTriangle} accent={kpis.overdueCount > 0 ? "primary" : "info"} />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 glass-panel border-0 transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="flex-row items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Progress per Area</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {areaBars.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState compact icon={BarChart3} title="No tasks yet" description="Add PM tasks to see per-area completion." />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={areaBars} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="area" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} unit="%" domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
                  <Bar dataKey="pct" name="Completion" radius={[6, 6, 0, 0]}>
                    {areaBars.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                    <LabelList dataKey="pct" position="top" formatter={(v: number) => `${v}%`} style={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-0 transition-shadow duration-200 hover:shadow-lg">
          <CardHeader className="flex-row items-center gap-2">
            <PieIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Distribusi Jenis Instrument</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {equipPie.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <EmptyState compact icon={PieIcon} title="No equipment yet" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={equipPie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {equipPie.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {equipPie.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                {equipPie.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="truncate text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 glass-panel border-0">
        <CardHeader className="flex-row items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">
            Pekerjaan Akan Jatuh Tempo · {settings.upcomingWindowDays} hari
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dueSoon.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing due soon" description="No upcoming or overdue tasks in the current window." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Number</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Plan Date</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dueSoon.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.tagNumber}</TableCell>
                      <TableCell><AreaBadge value={t.area} /></TableCell>
                      <TableCell className="text-sm">{t.equipmentType}</TableCell>
                      <TableCell className="text-sm tabular-nums">{t.planDate}</TableCell>
                      <TableCell className="text-sm">{t.pic || "—"}</TableCell>
                      <TableCell><TaskStatusBadge value={t.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* legend using STATUS_COLORS to reference the palette */}
      <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        {(["Finish","Inprogress","Behind","Scheduled"] as const).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s] }} />{s}
          </span>
        ))}
      </div>
    </AppShell>
  );
}
