import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { useAppStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import {
  daysUntilCalibration,
  healthBand,
  healthScore,
  nextCalibrationDate,
} from "@/lib/kpi";
import { CriticalityBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/health")({
  component: HealthPage,
});

function HealthPage() {
  const { instruments, maintenance, settings } = useAppStore();

  const list = instruments
    .map((i) => {
      const score = healthScore(i, maintenance, settings);
      const band = healthBand(score, settings);
      const days = daysUntilCalibration(i, maintenance, settings);
      return { i, score, band, days, next: nextCalibrationDate(i, maintenance, settings) };
    })
    .sort((a, b) => a.score - b.score);

  const dotBg = {
    Excellent: "bg-success",
    Fair: "bg-warning",
    Poor: "bg-primary",
  };
  const cardBorder = {
    Excellent: "border-l-success",
    Fair: "border-l-warning",
    Poor: "border-l-primary",
  };

  return (
    <AppShell>
      <PageHeader
        title="Health Scoring & Calibration"
        description="Traffic-light view of all instruments with calibration status."
      />

      {list.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="py-14 text-center px-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold">No instruments to score</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add instruments and log maintenance to see health scores here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map(({ i, score, band, days, next }) => {
            const overdue = days !== null && days < 0;
            const dueSoon = days !== null && days >= 0 && days < 14;
            return (
              <Card
                key={i.id}
                className={cn(
                  "border-l-4 transition-all duration-200 hover:shadow-md",
                  cardBorder[band],
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate text-foreground">{i.tagNumber}</div>
                      <div className="text-xs text-muted-foreground truncate">{i.name}</div>
                    </div>
                    <span className={cn("h-3 w-3 rounded-full shrink-0 mt-1.5", dotBg[band])} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <CriticalityBadge value={i.criticality} />
                    <span className="text-xs text-muted-foreground">{i.location}</span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Health</span>
                      <span className="text-lg font-semibold tabular-nums text-foreground">{score}</span>
                    </div>
                    <Progress value={score} className="h-1.5" />
                  </div>
                  <div
                    className={cn(
                      "mt-3 text-xs flex items-center gap-1.5",
                      overdue
                        ? "text-primary font-medium"
                        : dueSoon
                          ? "text-warning-foreground dark:text-warning font-medium"
                          : "text-muted-foreground",
                    )}
                  >
                    {(overdue || dueSoon) && <AlertTriangle className="h-3.5 w-3.5" />}
                    {next
                      ? overdue
                        ? `Overdue by ${Math.abs(days!)} days`
                        : `Next calibration: ${next.toLocaleDateString()} (${days}d)`
                      : "No schedule"}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
