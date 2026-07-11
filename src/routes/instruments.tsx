import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { CriticalityBadge, HealthBadge } from "@/components/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { healthBand, healthScore, nextCalibrationDate } from "@/lib/kpi";
import type { Instrument } from "@/lib/types";

export const Route = createFileRoute("/instruments")({
  component: InstrumentsPage,
});

function InstrumentsPage() {
  const { instruments, maintenance, settings } = useAppStore();
  const [q, setQ] = useState("");
  const [unit, setUnit] = useState("all");
  const [type, setType] = useState("all");
  const [crit, setCrit] = useState("all");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  const units = Array.from(new Set(instruments.map((i) => i.location))).sort();

  const filtered = useMemo(() => {
    return instruments.filter((i) => {
      if (q && !`${i.tagNumber} ${i.name}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (unit !== "all" && i.location !== unit) return false;
      if (type !== "all" && i.type !== type) return false;
      if (crit !== "all" && i.criticality !== crit) return false;
      return true;
    });
  }, [instruments, q, unit, type, crit]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const shown = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <AppShell>
      <PageHeader
        title="Instrument Master Data"
        description="Inventory and specification of all instruments in Area 2."
        actions={
          <Button asChild>
            <Link to="/input"><Plus className="h-4 w-4 mr-1" />Add Instrument</Link>
          </Button>
        }
      />

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tag or name..." className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={unit} onValueChange={setUnit}>
            <SelectTrigger><SelectValue placeholder="Unit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {settings.instrumentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={crit} onValueChange={setCrit}>
            <SelectTrigger><SelectValue placeholder="Criticality" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Criticality</SelectItem>
              <SelectItem value="SCE">SCE</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Criticality</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((i) => {
                const score = healthScore(i, maintenance, settings);
                return (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                    <TableCell className="font-medium">{i.tagNumber}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.location}</TableCell>
                    <TableCell className="text-muted-foreground">{i.type}</TableCell>
                    <TableCell><CriticalityBadge value={i.criticality} /></TableCell>
                    <TableCell><HealthBadge score={score} band={healthBand(score, settings)} /></TableCell>
                  </TableRow>
                );
              })}
              {shown.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No instruments match your filters.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between p-3 border-t text-sm">
          <span className="text-muted-foreground">
            {filtered.length} instrument{filtered.length !== 1 && "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-6">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.tagNumber}</SheetTitle>
                <SheetDescription>{selected.name}</SheetDescription>
              </SheetHeader>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><div className="text-muted-foreground text-xs">Unit</div><div>{selected.location}</div></div>
                  <div><div className="text-muted-foreground text-xs">Type</div><div>{selected.type}</div></div>
                  <div><div className="text-muted-foreground text-xs">Criticality</div><div><CriticalityBadge value={selected.criticality} /></div></div>
                  <div><div className="text-muted-foreground text-xs">Commissioned</div><div>{selected.commissioningDate ?? "—"}</div></div>
                  <div><div className="text-muted-foreground text-xs">Running Hours</div><div>{selected.runningHours ?? "—"}</div></div>
                  <div><div className="text-muted-foreground text-xs">Next Calibration</div><div>{nextCalibrationDate(selected, maintenance, settings)?.toLocaleDateString() ?? "—"}</div></div>
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Health Score</div>
                  <HealthBadge score={healthScore(selected, maintenance, settings)} band={healthBand(healthScore(selected, maintenance, settings), settings)} />
                </div>
                <div>
                  <div className="text-sm font-semibold mb-2">Maintenance History</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {maintenance
                      .filter((m) => m.instrumentId === selected.id)
                      .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1))
                      .map((m) => (
                        <div key={m.id} className="rounded-md border p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{m.type} · {m.activity}</span>
                            <span className="text-xs text-muted-foreground">{new Date(m.dateTime).toLocaleDateString()}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">By {m.technician} · {m.finalStatus}</div>
                        </div>
                      ))}
                    {maintenance.filter((m) => m.instrumentId === selected.id).length === 0 && (
                      <div className="text-sm text-muted-foreground">No history yet.</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
