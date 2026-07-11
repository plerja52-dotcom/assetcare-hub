import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRef } from "react";
import { Download, Upload, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { settings, updateSettings, resetAll, importBackup, instruments, maintenance } = useAppStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = () => {
    const data = { instruments, maintenance, settings, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `rid-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Backup exported");
  };

  const onImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.instruments || !data.maintenance || !data.settings) throw new Error("Invalid backup file");
      importBackup(data);
      toast.success("Backup restored");
    } catch (e) {
      toast.error(`Import failed: ${(e as Error).message}`);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Settings" description="System configuration for intervals, thresholds, and health scoring." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Health Scoring Thresholds</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Excellent (≥)</Label>
              <Input type="number" value={settings.healthExcellentMin} onChange={(e) => updateSettings({ healthExcellentMin: +e.target.value })} />
            </div>
            <div>
              <Label>Fair (≥)</Label>
              <Input type="number" value={settings.healthFairMin} onChange={(e) => updateSettings({ healthFairMin: +e.target.value })} />
            </div>
            <div>
              <Label>Calibration Tolerance (%)</Label>
              <Input type="number" step="0.1" value={settings.calibrationTolerancePct} onChange={(e) => updateSettings({ calibrationTolerancePct: +e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">PM / Calibration Intervals</CardTitle></CardHeader>
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
                      next[idx] = { ...rule, calibrationIntervalDays: +e.target.value };
                      updateSettings({ intervals: next });
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Backup & Reset</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={exportBackup}><Download className="h-4 w-4 mr-1" />Export JSON Backup</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" />Import Backup</Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
            <Button variant="destructive" onClick={() => { if (confirm("Reset all data to defaults?")) { resetAll(); toast.success("Data reset"); } }}>
              <RotateCcw className="h-4 w-4 mr-1" />Reset to Seed Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
