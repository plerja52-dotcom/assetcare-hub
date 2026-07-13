import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Download, Upload, RotateCcw, Lock, ShieldCheck, ExternalLink } from "lucide-react";
import { useCurrentUser } from "@/lib/auth-store";
import { Link } from "@tanstack/react-router";
import type { Criticality } from "@/lib/types";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Pertamina Reliability" }] }),
  component: SettingsPage,
});

const LAST_EXPORT_KEY = "rid-last-export";
const CRITS: Criticality[] = ["SCE", "High", "Medium", "Low"];

function SettingsPage() {
  const {
    settings,
    updateSettings,
    resetAll,
    importBackup,
    instruments,
    maintenance,
  } = useAppStore();
  const me = useCurrentUser();
  const isAdmin = me?.role === "Admin";
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLastExport(localStorage.getItem(LAST_EXPORT_KEY));
    } catch {}
  }, []);

  // Validation
  const thresholdsInvalid = settings.healthExcellentMin <= settings.healthFairMin;

  const exportBackup = () => {
    const data = { instruments, maintenance, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rid-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    const stamp = new Date().toISOString();
    try { localStorage.setItem(LAST_EXPORT_KEY, stamp); } catch {}
    setLastExport(stamp);
    toast.success("Backup exported");
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.instruments || !data.maintenance || !data.settings)
        throw new Error("Invalid backup file");
      importBackup(data);
      toast.success("Backup restored");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    }
  };

  const escalation = settings.escalation ?? [];
  const setEscalation = (crit: Criticality, recipients: string) => {
    const existing = escalation.find((e) => e.criticality === crit);
    const next = existing
      ? escalation.map((e) => (e.criticality === crit ? { ...e, recipients } : e))
      : [...escalation, { criticality: crit, recipients }];
    updateSettings({ escalation: next });
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Configure health scoring, calibration intervals, and escalation. Backup & Reset are Admin-only."
      />

      <Tabs defaultValue="health" className="w-full">
        <TabsList className="mb-6 glass-panel border border-border/60">
          <TabsTrigger value="health">Health Scoring</TabsTrigger>
          <TabsTrigger value="intervals">PM &amp; Calibration</TabsTrigger>
          <TabsTrigger value="escalation">Escalation</TabsTrigger>
          <TabsTrigger value="backup">
            Backup &amp; Reset
            {!isAdmin && <Lock className="h-3 w-3 ml-1.5 opacity-70" />}
          </TabsTrigger>
        </TabsList>

        {/* ------- Health ------- */}
        <TabsContent value="health">
          <Card className="glass-panel border-0">
            <CardHeader>
              <CardTitle className="text-base">Health Scoring Thresholds</CardTitle>
              <p className="text-xs text-muted-foreground">
                Bands used by Health &amp; Calibration and dashboard status colors.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div>
                <Label>Excellent (≥)</Label>
                <Input
                  type="number"
                  value={settings.healthExcellentMin}
                  onChange={(e) =>
                    updateSettings({ healthExcellentMin: +e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Fair (≥)</Label>
                <Input
                  type="number"
                  value={settings.healthFairMin}
                  onChange={(e) => updateSettings({ healthFairMin: +e.target.value })}
                />
                {thresholdsInvalid && (
                  <p className="text-xs text-primary mt-1">
                    Excellent threshold must be higher than Fair threshold.
                  </p>
                )}
              </div>
              <div>
                <Label>Calibration Tolerance (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.calibrationTolerancePct}
                  onChange={(e) =>
                    updateSettings({ calibrationTolerancePct: +e.target.value })
                  }
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  A calibration deviation greater than this is treated as out-of-tolerance.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------- Intervals ------- */}
        <TabsContent value="intervals">
          <Card className="glass-panel border-0">
            <CardHeader>
              <CardTitle className="text-base">PM &amp; Calibration Intervals</CardTitle>
              <p className="text-xs text-muted-foreground">
                Per instrument type, in days. Drives due-soon / overdue detection.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {settings.intervals.map((rule, idx) => (
                <div key={rule.type} className="grid grid-cols-3 gap-2 items-end">
                  <div className="text-sm font-medium">{rule.type}</div>
                  <div>
                    <Label className="text-xs">PM (days)</Label>
                    <Input
                      type="number"
                      value={rule.pmIntervalDays}
                      onChange={(e) => {
                        const next = [...settings.intervals];
                        next[idx] = { ...rule, pmIntervalDays: +e.target.value };
                        updateSettings({ intervals: next });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Cal (days)</Label>
                    <Input
                      type="number"
                      value={rule.calibrationIntervalDays}
                      onChange={(e) => {
                        const next = [...settings.intervals];
                        next[idx] = {
                          ...rule,
                          calibrationIntervalDays: +e.target.value,
                        };
                        updateSettings({ intervals: next });
                      }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------- Escalation ------- */}
        <TabsContent value="escalation">
          <Card className="glass-panel border-0">
            <CardHeader>
              <CardTitle className="text-base">Escalation Matrix</CardTitle>
              <p className="text-xs text-muted-foreground">
                Comma-separated notification recipients per criticality tier.
              </p>
            </CardHeader>
            <CardContent className="space-y-3 max-w-2xl">
              {CRITS.map((c) => (
                <div key={c} className="grid grid-cols-4 items-center gap-3">
                  <Label className="text-sm">{c}</Label>
                  <Input
                    className="col-span-3"
                    placeholder="engineer@pertamina.com, lead@pertamina.com"
                    value={escalation.find((e) => e.criticality === c)?.recipients ?? ""}
                    onChange={(e) => setEscalation(c, e.target.value)}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------- Backup & Reset (Admin only) ------- */}
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Irreversible / data-wide actions. Restricted to Admin accounts.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Last exported:{" "}
                  <span className="text-foreground font-medium">
                    {lastExport ? new Date(lastExport).toLocaleString() : "—"}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    disabled={!isAdmin}
                    onClick={exportBackup}
                    tooltip={!isAdmin ? "Admin only" : undefined}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export JSON Backup
                  </ActionButton>
                  <ActionButton
                    disabled={!isAdmin}
                    onClick={() => fileRef.current?.click()}
                    tooltip={!isAdmin ? "Admin only" : undefined}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Import Backup
                  </ActionButton>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])}
                  />
                  <ActionButton
                    disabled={!isAdmin}
                    onClick={() => {
                      if (confirm("Reset all data? This cannot be undone.")) {
                        resetAll();
                        toast.success("Data reset");
                      }
                    }}
                    tooltip={!isAdmin ? "Admin only" : undefined}
                    variant="destructive"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset to Empty
                  </ActionButton>
                </div>
              </TooltipProvider>

              {isAdmin && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <div className="flex items-center gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-info" />
                    <span className="font-medium">Admin tools</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Manage user accounts and roles.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin/users">
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Open User Management
                    </Link>
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

function ActionButton({
  disabled,
  onClick,
  tooltip,
  variant,
  children,
}: {
  disabled?: boolean;
  onClick: () => void;
  tooltip?: string;
  variant: "outline" | "destructive";
  children: React.ReactNode;
}) {
  const btn = (
    <Button variant={variant} onClick={onClick} disabled={disabled}>
      {children}
    </Button>
  );
  if (!tooltip) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{btn}</span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
