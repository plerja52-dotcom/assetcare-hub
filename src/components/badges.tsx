import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Criticality, FinalStatus, MaintenanceType } from "@/lib/types";

export function CriticalityBadge({ value }: { value: Criticality }) {
  const map: Record<Criticality, string> = {
    High: "bg-primary/10 text-primary border-primary/30",
    Medium: "bg-warning/15 text-warning-foreground border-warning/40 dark:text-warning",
    Low: "bg-success/15 text-success-foreground border-success/40 dark:text-success",
    SCE: "bg-sce/15 text-sce border-sce/40",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[value])}>
      {value}
    </Badge>
  );
}

export function StatusBadge({ value }: { value: FinalStatus }) {
  const map: Record<FinalStatus, string> = {
    "Online/Normal": "bg-success/15 text-success border-success/40",
    "Calibration Due": "bg-warning/20 text-warning-foreground border-warning/40 dark:text-warning",
    "Maintenance Required": "bg-primary/10 text-primary border-primary/40",
    Draft: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[value])}>
      {value}
    </Badge>
  );
}

export function TypeBadge({ value }: { value: MaintenanceType }) {
  return value === "PM" ? (
    <Badge variant="outline" className="bg-info/15 text-info border-info/40 font-medium">
      PM
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/40 font-medium">
      CM
    </Badge>
  );
}

export function HealthBadge({ score, band }: { score: number; band: "Excellent" | "Fair" | "Poor" }) {
  const map = {
    Excellent: "bg-success/15 text-success border-success/40",
    Fair: "bg-warning/20 text-warning-foreground dark:text-warning border-warning/40",
    Poor: "bg-primary/10 text-primary border-primary/40",
  };
  const dot = {
    Excellent: "bg-success",
    Fair: "bg-warning",
    Poor: "bg-primary",
  };
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", map[band])}>
      <span className={cn("h-2 w-2 rounded-full", dot[band])} />
      {score} · {band}
    </Badge>
  );
}
