import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { AreaBadge } from "@/components/badges";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Wrench, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Instrument } from "@/lib/types";

export const Route = createFileRoute("/instruments")({
  head: () => ({ meta: [{ title: "Instruments — Pertamina Reliability Instrumentation" }] }),
  component: InstrumentsPage,
});

function InstrumentsPage() {
  const { instruments, tasks, settings, removeInstrument } = useAppStore();
  const [q, setQ] = useState("");
  const [area, setArea] = useState("all");
  const [equip, setEquip] = useState("all");
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [confirmDel, setConfirmDel] = useState<Instrument | null>(null);

  const filtered = useMemo(() =>
    instruments.filter((i) =>
      (area === "all" || i.area === area) &&
      (equip === "all" || i.equipmentType === equip) &&
      (q === "" || `${i.tagNumber} ${i.equipmentType} ${i.lokasi ?? ""}`.toLowerCase().includes(q.toLowerCase())),
    ), [instruments, q, area, equip]);

  return (
    <AppShell>
      <PageHeader
        title="Instrument Master Data"
        description="Every physical asset tracked across Maintenance Area 2."
        actions={
          <Button asChild><Link to="/input"><Plus className="h-4 w-4 mr-1" />Add Instrument</Link></Button>
        }
      />

      <Card className="glass-panel border-0 mb-4">
        <CardContent className="p-4 flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tag, equipment, location…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Area" /></SelectTrigger>
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
        </CardContent>
      </Card>

      <Card className="glass-panel border-0">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title={instruments.length === 0 ? "No instruments yet" : "No matches"}
              description={instruments.length === 0
                ? "Add your first instrument to get started."
                : "Try clearing the filters or search text."}
              action={instruments.length === 0
                ? <Button asChild><Link to="/input"><Plus className="h-4 w-4 mr-1" />Add Instrument</Link></Button>
                : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag Number</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>PM Frequency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((i) => (
                    <TableRow key={i.id} className="cursor-pointer" onClick={() => setSelected(i)}>
                      <TableCell className="font-mono text-xs font-semibold">{i.tagNumber}</TableCell>
                      <TableCell><AreaBadge value={i.area} /></TableCell>
                      <TableCell className="text-sm">{i.equipmentType}</TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{i.lokasi || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {i.pmFrequency ? `${i.pmFrequency.count} ${i.pmFrequency.unit}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => { e.stopPropagation(); setConfirmDel(i); }}
                          aria-label="Delete instrument"
                        >
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

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="glass-panel border-0 sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{selected.tagNumber}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-3 text-sm">
                <Row label="Area"><AreaBadge value={selected.area} /></Row>
                <Row label="Equipment">{selected.equipmentType}</Row>
                <Row label="Lokasi">{selected.lokasi || "—"}</Row>
                <Row label="PM Frequency">
                  {selected.pmFrequency ? `${selected.pmFrequency.count} ${selected.pmFrequency.unit}` : "—"}
                </Row>
                <Row label="Task Records">
                  {tasks.filter((t) => t.instrumentId === selected.id).length}
                </Row>
                {selected.createdBy && (
                  <div className="pt-3 text-[11px] text-muted-foreground border-t border-border/60">
                    Added by {selected.createdBy}
                    {selected.createdAt && ` on ${new Date(selected.createdAt).toLocaleDateString()}`}
                  </div>
                )}
                <div className="pt-4">
                  <Button variant="destructive" size="sm" onClick={() => { setConfirmDel(selected); setSelected(null); }}>
                    <Trash2 className="h-4 w-4 mr-1.5" /> Delete instrument
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="glass-panel border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete instrument?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && (() => {
                const n = tasks.filter((t) => t.instrumentId === confirmDel.id).length;
                return `${confirmDel.tagNumber} will be removed${n ? ` along with ${n} related PM task record${n === 1 ? "" : "s"}` : ""}. This cannot be undone.`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => {
                if (!confirmDel) return;
                removeInstrument(confirmDel.id);
                toast.success(`${confirmDel.tagNumber} deleted`);
                setConfirmDel(null);
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] items-center gap-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}
