import type { Instrument, PmTaskRecord, Settings, TaskStatus } from "./types";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
export function todayISO() {
  return startOfDay(new Date()).toISOString().slice(0, 10);
}
export function isSameMonth(iso: string, ref: Date) {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}
export function daysBetween(a: Date, b: Date) {
  return Math.floor((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
}

/** Auto-derive status from dates. Preserves manual Inprogress override. */
export function deriveStatus(t: Pick<PmTaskRecord, "planDate" | "actualDate" | "manualStatus" | "status">): TaskStatus {
  if (t.actualDate) return "Finish";
  if (t.manualStatus && t.status === "Inprogress") return "Inprogress";
  const today = startOfDay(new Date());
  const plan = startOfDay(new Date(t.planDate));
  if (plan.getTime() < today.getTime()) return "Behind";
  return "Scheduled";
}

/** Recompute status for a batch — call whenever dates change. */
export function recomputeStatuses(tasks: PmTaskRecord[]): PmTaskRecord[] {
  return tasks.map((t) => ({ ...t, status: deriveStatus(t) }));
}

export interface DashboardFilters {
  area?: string;
  equipmentType?: string;
}

export interface DashboardKPIs {
  totalInstruments: number;
  progressThisMonthPct: number | null;   // Finish/planned this month
  finishedThisMonth: number;
  overdueCount: number;                  // running Behind backlog
}

export function computeKPIs(
  instruments: Instrument[],
  tasks: PmTaskRecord[],
  _settings: Settings,
  f: DashboardFilters = {},
): DashboardKPIs {
  const instFilter = (i: Instrument) =>
    (!f.area || i.area === f.area) && (!f.equipmentType || i.equipmentType === f.equipmentType);
  const taskFilter = (t: PmTaskRecord) =>
    (!f.area || t.area === f.area) && (!f.equipmentType || t.equipmentType === f.equipmentType);

  const fi = instruments.filter(instFilter);
  const ft = tasks.filter(taskFilter);

  const now = new Date();
  const thisMonthPlanned = ft.filter((t) => isSameMonth(t.planDate, now));
  const thisMonthFinish = thisMonthPlanned.filter((t) => t.status === "Finish");
  const progress = thisMonthPlanned.length
    ? Math.round((thisMonthFinish.length / thisMonthPlanned.length) * 100)
    : null;

  return {
    totalInstruments: fi.length,
    progressThisMonthPct: progress,
    finishedThisMonth: thisMonthFinish.length,
    overdueCount: ft.filter((t) => t.status === "Behind").length,
  };
}

export interface AreaProgress { area: string; total: number; finish: number; pct: number; }

export function progressByArea(tasks: PmTaskRecord[], f: DashboardFilters = {}): AreaProgress[] {
  const filtered = tasks.filter((t) => !f.equipmentType || t.equipmentType === f.equipmentType);
  const groups = new Map<string, { total: number; finish: number }>();
  for (const t of filtered) {
    const g = groups.get(t.area) ?? { total: 0, finish: 0 };
    g.total++;
    if (t.status === "Finish") g.finish++;
    groups.set(t.area, g);
  }
  return Array.from(groups, ([area, v]) => ({
    area,
    ...v,
    pct: v.total ? Math.round((v.finish / v.total) * 100) : 0,
  })).sort((a, b) => a.area.localeCompare(b.area));
}

export function equipmentDistribution(instruments: Instrument[], f: DashboardFilters = {}) {
  const list = instruments.filter((i) => !f.area || i.area === f.area);
  const map = new Map<string, number>();
  for (const i of list) map.set(i.equipmentType, (map.get(i.equipmentType) ?? 0) + 1);
  return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Upcoming (within N days) + overdue tasks, soonest / most-overdue first. */
export function dueSoonList(
  tasks: PmTaskRecord[],
  settings: Settings,
  f: DashboardFilters = {},
): PmTaskRecord[] {
  const today = startOfDay(new Date());
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + settings.upcomingWindowDays);
  return tasks
    .filter((t) => (!f.area || t.area === f.area) && (!f.equipmentType || t.equipmentType === f.equipmentType))
    .filter((t) => {
      if (t.actualDate) return false;
      const plan = startOfDay(new Date(t.planDate));
      return plan.getTime() <= horizon.getTime();
    })
    .sort((a, b) => (a.planDate < b.planDate ? -1 : 1));
}

/** For PM Status page — latest task per instrument. */
export function latestTaskByInstrument(tasks: PmTaskRecord[]): Map<string, PmTaskRecord> {
  const map = new Map<string, PmTaskRecord>();
  for (const t of tasks) {
    const existing = map.get(t.instrumentId);
    if (!existing || t.planDate > existing.planDate) map.set(t.instrumentId, t);
  }
  return map;
}

export const STATUS_COLORS: Record<TaskStatus, string> = {
  Finish: "var(--success)",
  Inprogress: "var(--warning)",
  Behind: "var(--primary)",
  Scheduled: "var(--muted-foreground)",
};
