import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { AreaBadge, ActivityTypeBadge, TaskStatusBadge } from "@/components/badges";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { History, Plus, Trash2, Search, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { ActivityType, PmTaskRecord, TaskStatus } from "@/lib/types";

export const Route = createFileRoute("/maintenance")({
  head: () => ({ meta: [{ title: "Maintenance History — Pertamina Reliability Instrumentation" }] }),
  component: MaintenancePage,
});

function toCsv(rows: PmTaskRecord[]) {
  const header = ["Tag Number","Area","Equipment","Period","Plan","Actual","PIC","Activity","Activity Type","Kendala","Status","Perbaikan Lanjutan","Catatan","Added By"];
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => [
    r.tagNumber, r.area, r.equipmentType, r.period ?? "", r.planDate, r.actualDate ?? "",
    r.pic, r.activity, r.activityType, r.kendala ?? "", r.status, r.perbaikanLanjutan ?? "",
    r.catatan ?? "", r.createdBy ?? "",
  ].map(escape).join(","));
  return [header.join(","), ...body].join("\n");
}

function MaintenancePage() {
  const { tasks, settings, removeTask } = useAppStore();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [equip, setEquip] = useState("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [aType, setAType] = useState<ActivityType | "all">("all");
  const [confirmDel, setConfirmDel] = useState<PmTaskRecord | null>(null);

  const filtered = useMemo(() =>
    tasks.filter((t) =>
      (area === "all" || t.area === area) &&
      (equip === "all" || t.equipmentType === equip) &&
      (status === "all" || t.status === status) &&
      (aType === "all" || t.activityType === aType) &&
      (q === "" || `${t.tagNumber} ${t.activity} ${t.pic}`.toLowerCase().includes(q.toLowerCase())),
    ).sort((a, b) => (a.planDate < b.planDate ? 1 : -1)),
    [tasks, q, area, equip, status, aType],
  );

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `maintenance-history-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <AppShell>
      <PageHeader
        title="Maintenance History"
        description="Every PM, PdM, and corrective follow-up task recorded across Area 2."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1.5" />Export CSV
            </Button>
            <Button asChild><Link to="/input"><Plus className="h-4 w-4 mr-1" />Log Task</Link></Button>
          </>
        }
      />

      <Card className="glass-panel border-0 mb-4">
        <CardContent className="p-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tag, activity, PIC…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Area" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {settings.areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={equip} onValueChange={setEquip}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Equipment" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {settings.equipmentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
          <Select value={aType} onValueChange={(v) => setAType(v as ActivityType | "all")}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {(["PM","PdM","Perbaikan"] as ActivityType[]).map((s) =>
                <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="glass-panel border-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={History}
              title={tasks.length === 0 ? "No tasks yet" : "No matches"}
              description={tasks.length === 0 ? "Log a PM or PdM task to see it here." : "Try clearing the filters."}
              action={tasks.length === 0
                ? <Button asChild><Link to="/input"><Plus className="h-4 w-4 mr-1" />Log Task</Link></Button>
                : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>PIC</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.tagNumber}</TableCell>
                      <TableCell><AreaBadge value={t.area} /></TableCell>
                      <TableCell className="text-sm">{t.equipmentType}</TableCell>
                      <TableCell className="text-sm">{t.period || "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">{t.planDate}</TableCell>
                      <TableCell className="text-sm tabular-nums">{t.actualDate ?? "—"}</TableCell>
                      <TableCell className="text-sm">{t.pic || "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs">
                        <div className="truncate" title={t.activity}>{t.activity}</div>
                        {(t.kendala || t.perbaikanLanjutan || t.catatan) && (
                          <div className="text-[11px] text-muted-foreground truncate">
                            {[t.kendala && `Kendala: ${t.kendala}`, t.perbaikanLanjutan && `Lanjut: ${t.perbaikanLanjutan}`, t.catatan]
                              .filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {t.createdBy && <div className="text-[10px] text-muted-foreground">Added by {t.createdBy}</div>}
                      </TableCell>
                      <TableCell><ActivityTypeBadge value={t.activityType} /></TableCell>
                      <TableCell><TaskStatusBadge value={t.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => setConfirmDel(t)} aria-label="Delete task">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="glass-panel border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task record?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && `Task for ${confirmDel.tagNumber} on ${confirmDel.planDate} will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => {
                if (!confirmDel) return;
                removeTask(confirmDel.id);
                toast.success("Task deleted");
                setConfirmDel(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
