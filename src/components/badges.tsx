import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityType, TaskStatus } from "@/lib/types";

export function TaskStatusBadge({ value }: { value: TaskStatus }) {
  const map: Record<TaskStatus, string> = {
    Finish: "bg-success/15 text-success border-success/40",
    Inprogress: "bg-warning/15 text-warning-foreground dark:text-warning border-warning/40",
    Behind: "bg-primary/10 text-primary border-primary/40",
    Scheduled: "bg-muted text-muted-foreground border-border",
  };
  const dot: Record<TaskStatus, string> = {
    Finish: "bg-success",
    Inprogress: "bg-warning",
    Behind: "bg-primary",
    Scheduled: "bg-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", map[value])}>
      <span className={cn("h-2 w-2 rounded-full", dot[value])} />
      {value}
    </Badge>
  );
}

export function ActivityTypeBadge({ value }: { value: ActivityType }) {
  const map: Record<ActivityType, string> = {
    PM: "bg-info/15 text-info border-info/40",
    PdM: "bg-sce/15 text-sce border-sce/40",
    Perbaikan: "bg-primary/10 text-primary border-primary/40",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[value])}>
      {value}
    </Badge>
  );
}

export function AreaBadge({ value }: { value: string }) {
  return (
    <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 text-foreground border-border">
      {value}
    </Badge>
  );
}
