import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CriticalityBadge } from "@/components/badges";
import { daysUntilCalibration, healthScore, isOverdue } from "@/lib/kpi";
import { AlertTriangle, ShieldAlert, Bell } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { instruments, maintenance, settings, updateSettings } = useAppStore();

  const alerts = instruments
    .map((i) => {
      const overdue = isOverdue(i, maintenance, settings);
      const days = daysUntilCalibration(i, maintenance, settings);
      const score = healthScore(i, maintenance, settings);
      const criticalSCE = i.criticality === "SCE" && (overdue || score < settings.healthFairMin);
      const highUrgency = i.criticality === "High" && overdue;
      return { i, overdue, days, score, critical: criticalSCE || highUrgency };
    })
    .filter((a) => a.overdue || a.critical)
    .sort((a, b) => Number(b.critical) - Number(a.critical));

  return (
    <AppShell>
      <PageHeader
        title="Notifications & Escalation"
        description="Active alerts based on criticality and calibration status."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {alerts.map(({ i, overdue, days, score, critical }) => (
            <Card key={i.id} className={critical ? "border-primary/40" : ""}>
              <CardContent className="p-4 flex items-start gap-4">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${critical ? "bg-primary/10 text-primary" : "bg-warning/20 text-warning-foreground dark:text-warning"}`}>
                  {critical ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{i.tagNumber}</span>
                    <CriticalityBadge value={i.criticality} />
                    <span className="text-xs text-muted-foreground">· {i.location}</span>
                  </div>
                  <div className="text-sm mt-1">
                    {critical && <span className="font-medium text-primary">High Urgency: </span>}
                    {overdue
                      ? `Calibration overdue by ${Math.abs(days ?? 0)} days.`
                      : `Health score ${score} below threshold.`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Notify: {settings.escalation.find((e) => e.criticality === i.criticality)?.recipients}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {alerts.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No active alerts. All instruments within thresholds.
            </CardContent></Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Escalation Matrix</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {settings.escalation.map((rule, idx) => (
              <div key={rule.criticality} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <CriticalityBadge value={rule.criticality} />
                </div>
                <Input
                  value={rule.recipients}
                  onChange={(e) => {
                    const next = [...settings.escalation];
                    next[idx] = { ...rule, recipients: e.target.value };
                    updateSettings({ escalation: next });
                  }}
                  onBlur={() => toast.success("Escalation updated")}
                  placeholder="email1, email2"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
