import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { useCurrentUser, useIsAdmin } from "@/lib/auth-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRef, useState } from "react";
import {
  Download, Upload, RotateCcw, Plus, X, Lock, ShieldCheck, ExternalLink,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { FrequencyUnit } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Pertamina Reliability Instrumentation" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    settings, updateSettings, addArea, removeArea, addEquipmentType, removeEquipmentType,
    instruments, tasks, resetAll, importBackup,
  } = useAppStore();
  const isAdmin = useIsAdmin();
  const user = useCurrentUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [newArea, setNewArea] = useState("");
  const [newEquip, setNewEquip] = useState("");

  function exportBackup() {
    const blob = new Blob(
      [JSON.stringify({ instruments, tasks, settings }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rid-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setLastExport(new Date().toISOString());
    toast.success("Backup exported");
  }

  async function onImport(file: File) {
    try {
      const data = JSON.parse(await file.text());
      importBackup(data);
      toast.success("Backup imported");
    } catch { toast.error("Invalid backup file"); }
  }

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Configure areas, equipment types, PM frequencies, escalation, and data management."
      />

      {!user && (
        <Card className="glass-panel border-0 mb-4">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Sign in to edit settings.
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="glass-surface border border-border/60">
          <TabsTrigger value="areas">Areas & Equipment</TabsTrigger>
          <TabsTrigger value="frequency">PM Frequency</TabsTrigger>
          <TabsTrigger value="escalation">Escalation</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="backup">Backup & Reset</TabsTrigger>
        </TabsList>

        <TabsContent value="areas">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="glass-panel border-0">
              <CardHeader><CardTitle className="text-base">Area List</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {settings.areas.map((a) => (
                    <Badge key={a} variant="outline" className="gap-1.5 pl-2.5">
                      {a}
                      <button
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => removeArea(a)}
                        aria-label={`Remove area ${a}`}
                      ><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {settings.areas.length === 0 && <span className="text-xs text-muted-foreground">No areas defined.</span>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add area (e.g. 12, AHU)" value={newArea} onChange={(e) => setNewArea(e.target.value)} />
                  <Button onClick={() => { if (newArea.trim()) { addArea(newArea.trim()); setNewArea(""); } }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-panel border-0">
              <CardHeader><CardTitle className="text-base">Equipment Type List</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {settings.equipmentTypes.map((t) => (
                    <Badge key={t} variant="outline" className="gap-1.5 pl-2.5">
                      {t}
                      <button
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => removeEquipmentType(t)}
                        aria-label={`Remove ${t}`}
                      ><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {settings.equipmentTypes.length === 0 && <span className="text-xs text-muted-foreground">No equipment types defined.</span>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Add equipment type" value={newEquip} onChange={(e) => setNewEquip(e.target.value)} />
                  <Button onClick={() => { if (newEquip.trim()) { addEquipmentType(newEquip.trim()); setNewEquip(""); } }}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="frequency">
          <Card className="glass-panel border-0">
            <CardHeader>
              <CardTitle className="text-base">PM Frequency per Equipment Type</CardTitle>
              <p className="text-xs text-muted-foreground">Default frequency used to schedule PM tasks. Overridable per instrument.</p>
            </CardHeader>
            <CardContent className="space-y-3 max-w-xl">
              {settings.equipmentTypes.map((et) => {
                const f = settings.frequencyByType[et] ?? { count: 1, unit: "tahun" as FrequencyUnit };
                return (
                  <div key={et} className="grid grid-cols-[1fr_100px_140px] gap-2 items-center">
                    <Label>{et}</Label>
                    <Input type="number" min={1} value={f.count}
                      onChange={(e) => updateSettings({
                        frequencyByType: { ...settings.frequencyByType, [et]: { ...f, count: Math.max(1, +e.target.value) } },
                      })} />
                    <Select value={f.unit} onValueChange={(v) => updateSettings({
                      frequencyByType: { ...settings.frequencyByType, [et]: { ...f, unit: v as FrequencyUnit } },
                    })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minggu">minggu</SelectItem>
                        <SelectItem value="bulan">bulan</SelectItem>
                        <SelectItem value="tahun">tahun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalation">
          <Card className="glass-panel border-0">
            <CardHeader>
              <CardTitle className="text-base">Escalation Matrix (per Area)</CardTitle>
              <p className="text-xs text-muted-foreground">Comma-separated recipients notified when a task in that Area goes Behind.</p>
            </CardHeader>
            <CardContent className="space-y-3 max-w-2xl">
              {settings.areas.map((area) => {
                const rec = settings.escalation.find((e) => e.area === area)?.recipients ?? "";
                return (
                  <div key={area} className="grid grid-cols-4 items-center gap-3">
                    <Label className="text-sm">{area}</Label>
                    <Input className="col-span-3" placeholder="engineer@pertamina.com, lead@pertamina.com" value={rec}
                      onChange={(e) => {
                        const others = settings.escalation.filter((x) => x.area !== area);
                        updateSettings({ escalation: [...others, { area, recipients: e.target.value }] });
                      }} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dashboard">
          <Card className="glass-panel border-0 max-w-lg">
            <CardHeader><CardTitle className="text-base">Dashboard</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>"Upcoming" window (days)</Label>
                <Input type="number" min={1} value={settings.upcomingWindowDays}
                  onChange={(e) => updateSettings({ upcomingWindowDays: Math.max(1, +e.target.value) })} />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Controls the "Due soon" list on the dashboard. Overdue items always appear regardless.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup">
          <Card className="glass-panel border-0">
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    Backup &amp; Reset
                    {!isAdmin && (
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Admin only
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Irreversible / data-wide actions. Restricted to Admin accounts.</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last exported: <span className="text-foreground font-medium">
                    {lastExport ? new Date(lastExport).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="flex flex-wrap gap-3">
                  <ActionButton disabled={!isAdmin} onClick={exportBackup} tooltip={!isAdmin ? "Admin only" : undefined} variant="outline">
                    <Download className="h-4 w-4 mr-1" />Export JSON Backup
                  </ActionButton>
                  <ActionButton disabled={!isAdmin} onClick={() => fileRef.current?.click()} tooltip={!isAdmin ? "Admin only" : undefined} variant="outline">
                    <Upload className="h-4 w-4 mr-1" />Import Backup
                  </ActionButton>
                  <input ref={fileRef} type="file" accept="application/json" className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
                  <ActionButton disabled={!isAdmin} onClick={() => {
                    if (confirm("Reset all data? This cannot be undone.")) { resetAll(); toast.success("Data reset"); }
                  }} tooltip={!isAdmin ? "Admin only" : undefined} variant="destructive">
                    <RotateCcw className="h-4 w-4 mr-1" />Reset to Empty
                  </ActionButton>
                </div>
              </TooltipProvider>
              {isAdmin && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-info" />
                    <span className="font-medium">Admin tools</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Manage user accounts, approvals, and sessions.</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/users"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open User Management</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function ActionButton({ disabled, onClick, tooltip, variant, children }: {
  disabled?: boolean; onClick: () => void; tooltip?: string;
  variant: "outline" | "destructive"; children: React.ReactNode;
}) {
  const btn = <Button variant={variant} onClick={onClick} disabled={disabled}>{children}</Button>;
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild><span className="inline-flex">{btn}</span></TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
