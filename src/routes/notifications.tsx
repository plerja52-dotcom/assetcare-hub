import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { AreaBadge } from "@/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AlertTriangle, Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { daysBetween } from "@/lib/kpi";
import { toast } from "sonner";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Pertamina Reliability Instrumentation" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { tasks, settings } = useAppStore();

  const overdue = useMemo(
    () => tasks.filter((t) => t.status === "Behind")
      .sort((a, b) => (a.planDate < b.planDate ? -1 : 1)),
    [tasks],
  );

  const byArea = useMemo(() => {
    const map = new Map<string, typeof overdue>();
    for (const t of overdue) {
      const arr = map.get(t.area) ?? [];
      arr.push(t); map.set(t.area, arr);
    }
    return Array.from(map, ([area, items]) => ({ area, items })).sort((a,b) => a.area.localeCompare(b.area));
  }, [overdue]);

  const recipientsFor = (area: string) =>
    settings.escalation.find((e) => e.area === area)?.recipients ?? "";

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        description="Every task currently overdue (Behind), grouped by Area with its escalation recipients."
      />

      {overdue.length === 0 ? (
        <Card className="glass-panel border-0">
          <CardContent className="p-0">
            <EmptyState
              icon={Bell}
              title="No overdue tasks"
              description="Every planned PM task is on time. Notifications trigger when a task's plan date passes without an actual date recorded."
              action={<Button asChild variant="outline"><Link to="/input"><Plus className="h-4 w-4 mr-1" />Log Task</Link></Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byArea.map(({ area, items }) => {
            const recipients = recipientsFor(area);
            return (
              <Card key={area} className="glass-panel border-0">
                <CardHeader className="flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Area <AreaBadge value={area} /> · {items.length} overdue</CardTitle>
                  </div>
                  <Button
                    size="sm" variant="outline"
                    disabled={!recipients}
                    onClick={() => toast.success(`Notification queued to ${recipients}`)}
                  >
                    {recipients ? "Send escalation" : "No recipients set"}
                  </Button>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  <div className="mb-2">
                    Recipients:{" "}
                    <span className="text-foreground">
                      {recipients || <Link to="/settings" className="underline">configure in Settings</Link>}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {items.map((t) => {
                      const dayLate = -daysBetween(new Date(t.planDate), new Date());
                      return (
                        <li key={t.id} className="py-2 grid grid-cols-[1fr_auto] items-center gap-3">
                          <div className="min-w-0">
                            <div className="font-mono text-xs text-foreground">{t.tagNumber} · {t.equipmentType}</div>
                            <div className="truncate">{t.activity || "—"} · plan {t.planDate}</div>
                          </div>
                          <div className="text-primary font-semibold text-xs whitespace-nowrap">
                            {dayLate} day{dayLate === 1 ? "" : "s"} late
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
