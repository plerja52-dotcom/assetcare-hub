import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { StatusBadge, TypeBadge } from "@/components/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/maintenance")({
  component: MaintenancePage,
});

function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(name: string, content: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function MaintenancePage() {
  const { maintenance } = useAppStore();
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    return [...maintenance]
      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1))
      .filter((m) => {
        if (q && !`${m.tagNumber} ${m.activity} ${m.technician}`.toLowerCase().includes(q.toLowerCase())) return false;
        if (type !== "all" && m.type !== type) return false;
        if (status !== "all" && m.finalStatus !== status) return false;
        return true;
      });
  }, [maintenance, q, type, status]);

  const exportCsv = () => {
    const csv = toCSV(filtered.map((m) => ({
      Date: new Date(m.dateTime).toISOString(),
      Tag: m.tagNumber,
      Type: m.type,
      Activity: m.activity,
      Status: m.finalStatus,
      FailureMode: m.failureMode ?? "",
      RepairHours: m.repairTimeHours ?? "",
      DowntimeHours: m.downtimeHours ?? "",
      CalibrationBefore: m.calibrationBefore ?? "",
      CalibrationAfter: m.calibrationAfter ?? "",
      Technician: m.technician,
    })));
    download("maintenance-log.csv", csv);
    toast.success("Exported to CSV");
  };

  return (
    <AppShell>
      <PageHeader
        title="Maintenance History"
        description="Complete log of PM and CM activities."
        actions={<Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>}
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tag, activity, technician..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="PM">Preventive (PM)</SelectItem>
              <SelectItem value="CM">Corrective (CM)</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Online/Normal">Online/Normal</SelectItem>
              <SelectItem value="Calibration Due">Calibration Due</SelectItem>
              <SelectItem value="Maintenance Required">Maintenance Required</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Failure Mode</TableHead>
                <TableHead>Repair (h)</TableHead>
                <TableHead>Downtime (h)</TableHead>
                <TableHead>Technician</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => (
                <TableRow key={m.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{new Date(m.dateTime).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{m.tagNumber}</TableCell>
                  <TableCell><TypeBadge value={m.type} /></TableCell>
                  <TableCell>{m.activity}</TableCell>
                  <TableCell><StatusBadge value={m.finalStatus} /></TableCell>
                  <TableCell className="text-muted-foreground">{m.failureMode ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{m.repairTimeHours ?? "—"}</TableCell>
                  <TableCell className="tabular-nums">{m.downtimeHours ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.technician}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <div className="py-10 text-center">
                      <p className="text-sm font-medium">No maintenance records yet</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Log a PM or CM activity from the Input Data page.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppShell>
  );
}
