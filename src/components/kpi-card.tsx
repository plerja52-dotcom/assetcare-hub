import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDown, ArrowUp } from "lucide-react";

export function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  trend,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  suffix?: string;
  icon: LucideIcon;
  trend?: number;
  accent?: "primary" | "success" | "warning" | "info" | "sce";
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground dark:text-warning",
    info: "bg-info/15 text-info",
    sce: "bg-sce/15 text-sce",
  };
  const up = (trend ?? 0) >= 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {value}
              </span>
              {suffix && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}
            </div>
            {trend !== undefined && (
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                  up ? "text-success" : "text-primary",
                )}
              >
                {up ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}% vs last period
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg shrink-0",
              accentMap[accent],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:justify-between mb-6">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
