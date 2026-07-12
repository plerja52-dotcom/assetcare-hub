import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current;
    const to = target;
    if (from === to) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else prev.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function formatValue(v: string | number | null, decimals = 0) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, {
    maximumFractionDigits: decimals,
  });
}

export function KpiCard({
  label,
  value,
  suffix,
  icon: Icon,
  accent = "info",
  decimals = 0,
}: {
  label: string;
  value: string | number | null;
  suffix?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "info" | "sce";
  decimals?: number;
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-warning-foreground dark:text-warning",
    info: "bg-info/15 text-info",
    sce: "bg-sce/15 text-sce",
  };
  const numeric = typeof value === "number" ? value : null;
  const animated = useCountUp(numeric ?? 0);
  const display =
    numeric !== null
      ? formatValue(animated, decimals)
      : formatValue(value, decimals);
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              {label}
            </p>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tabular-nums tracking-tight text-foreground">
                {display}
              </span>
              {suffix && value !== null && (
                <span className="text-sm text-muted-foreground">{suffix}</span>
              )}
            </div>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
