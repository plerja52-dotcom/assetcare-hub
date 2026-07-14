import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { latestTaskByInstrument, STATUS_COLORS } from "@/lib/kpi";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Activity, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { AreaBadge, TaskStatusBadge } from "@/components/badges";
import type { TaskStatus } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "PM Status — Pertamina Reliability Instrumentation" }] }),
  component: PmStatusPage,
});

function PmStatusPage() {
  const { instruments, tasks, settings } = useAppStore();
  const latest = useMemo(() => latestTaskByInstrument(tasks), [tasks]);
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");

  const rows = useMemo(() => {
    return instruments
      .filter((i) => area === "all" || i.area === area)
      .filter((i) => q === "" || `${i.tagNumber} ${i.equipmentType} ${i.lokasi ?? ""}`.toLowerCase().includes(q.toLowerCase()))
      .map((i) => {
        const t = latest.get(i.id);
        const s: TaskStatus = t?.status ?? "Scheduled";
        return { i, t, s };
      })
      .filter((r) => status === "all" || r.s === status)
      .sort((a, b) => a.i.tagNumber.localeCompare(b.i.tagNumber));
  }, [instruments, latest, q, area, status]);

  const hasData = instruments.length > 0;

  return (
    <AppShell>
      <PageHeader
        title="PM Status"
        description="At-a-glance PM traffic light for each instrument, grounded in its most recent task."
        actions={
          <>
            <Input placeholder="Search tag / equipment…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Select value={area} onValueChange={setArea}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Area" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Areas</SelectItem>
                {settings.areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus | "all")}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(["Finish","Inprogress","Behind","Scheduled"] as TaskStatus[]).map((s) =>
                  <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
      />

      {!hasData ? (
        <Card className="glass-panel border-0">
          <CardContent className="p-0">
            <EmptyState
              icon={Activity}
              title="No instruments yet"
              description="Add instruments to see their PM status."
              action={<Button asChild><Link to="/input"><Plus className="h-4 w-4 mr-1" />Add Instrument</Link></Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map(({ i, t, s }) => (
            <Card
              key={i.id}
              className="glass-panel border-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
              style={{ borderLeft: `4px solid ${STATUS_COLORS[s]}` }}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold truncate">{i.tagNumber}</span>
                  <AreaBadge value={i.area} />
                </div>
                <div className="text-xs text-muted-foreground truncate">{i.equipmentType}</div>
                <div className="pt-1"><TaskStatusBadge value={s} /></div>
                <div className="text-[11px] text-muted-foreground grid grid-cols-2 gap-x-2">
                  <span>Next plan</span>
                  <span className="text-right tabular-nums text-foreground">{t?.planDate ?? "—"}</span>
                  <span>Last activity</span>
                  <span className="text-right tabular-nums text-foreground">{t?.actualDate ?? "—"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
