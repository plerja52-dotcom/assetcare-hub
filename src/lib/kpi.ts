import type {
  Instrument,
  MaintenanceRecord,
  Settings,
} from "./types";

export function daysBetween(a: Date, b: Date) {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

export function lastMaintenance(
  instrumentId: string,
  records: MaintenanceRecord[],
) {
  return records
    .filter((r) => r.instrumentId === instrumentId)
    .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1))[0];
}

export function nextCalibrationDate(
  ins: Instrument,
  records: MaintenanceRecord[],
  settings: Settings,
): Date | null {
  const rule = settings.intervals.find((r) => r.type === ins.type);
  if (!rule) return null;
  const cals = records
    .filter(
      (r) =>
        r.instrumentId === ins.id &&
        r.activity.toLowerCase().includes("calibration"),
    )
    .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1));
  const base = cals[0]
    ? new Date(cals[0].dateTime)
    : ins.commissioningDate
      ? new Date(ins.commissioningDate)
      : new Date();
  const d = new Date(base);
  d.setDate(d.getDate() + rule.calibrationIntervalDays);
  return d;
}

export function isOverdue(
  ins: Instrument,
  records: MaintenanceRecord[],
  settings: Settings,
) {
  const next = nextCalibrationDate(ins, records, settings);
  if (!next) return false;
  return next.getTime() < Date.now();
}

export function daysUntilCalibration(
  ins: Instrument,
  records: MaintenanceRecord[],
  settings: Settings,
) {
  const next = nextCalibrationDate(ins, records, settings);
  if (!next) return null;
  return daysBetween(next, new Date());
}

export function healthScore(
  ins: Instrument,
  records: MaintenanceRecord[],
  settings: Settings,
): number {
  let score = 100;
  const insRecords = records.filter((r) => r.instrumentId === ins.id);
  const cmCount = insRecords.filter((r) => r.type === "CM").length;
  score -= cmCount * 8;

  const days = daysUntilCalibration(ins, records, settings);
  if (days !== null) {
    if (days < 0) score -= Math.min(30, Math.abs(days) / 2);
    else if (days < 14) score -= 5;
  }

  const last = insRecords
    .filter((r) => r.calibrationAfter !== undefined)
    .sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1))[0];
  if (last && last.calibrationAfter !== undefined) {
    if (last.calibrationAfter > settings.calibrationTolerancePct) {
      score -= 10;
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function healthBand(
  score: number,
  settings: Settings,
): "Excellent" | "Fair" | "Poor" {
  if (score >= settings.healthExcellentMin) return "Excellent";
  if (score >= settings.healthFairMin) return "Fair";
  return "Poor";
}

export interface DashboardKPIs {
  totalInstruments: number;
  availability: number | null;
  mtbfDays: number | null;
  mttrHours: number | null;
  overdueCalibrations: number;
  pmRatio: number | null;
  cmRatio: number | null;
  hasData: boolean;
}

export function computeKPIs(
  instruments: Instrument[],
  maintenance: MaintenanceRecord[],
  settings: Settings,
  filters?: { from?: Date; to?: Date; unit?: string; criticality?: string },
): DashboardKPIs {
  const filteredInstruments = instruments.filter(
    (i) =>
      (!filters?.unit || i.location === filters.unit) &&
      (!filters?.criticality || i.criticality === filters.criticality),
  );
  const insIds = new Set(filteredInstruments.map((i) => i.id));
  const inRange = (r: MaintenanceRecord) => {
    const d = new Date(r.dateTime);
    if (filters?.from && d < filters.from) return false;
    if (filters?.to && d > filters.to) return false;
    return insIds.has(r.instrumentId);
  };
  const recs = maintenance.filter(inRange);
  const cm = recs.filter((r) => r.type === "CM");
  const pm = recs.filter((r) => r.type === "PM");

  const hasInstruments = filteredInstruments.length > 0;
  const totalHours = hasInstruments ? 24 * 30 * filteredInstruments.length : 0;
  const totalDowntime = recs.reduce((s, r) => s + (r.downtimeHours ?? 0), 0);
  const availability =
    totalHours > 0
      ? +(((totalHours - totalDowntime) / totalHours) * 100).toFixed(2)
      : null;

  const mtbfDays =
    cm.length > 0
      ? Math.round((filteredInstruments.length * 30) / cm.length)
      : hasInstruments
        ? filteredInstruments.length * 30
        : null;
  const totalRepair = cm.reduce((s, r) => s + (r.repairTimeHours ?? 0), 0);
  const mttrHours = cm.length > 0 ? +(totalRepair / cm.length).toFixed(2) : null;

  const overdue = filteredInstruments.filter((i) =>
    isOverdue(i, maintenance, settings),
  ).length;

  const total = pm.length + cm.length;
  return {
    totalInstruments: filteredInstruments.length,
    availability,
    mtbfDays,
    mttrHours,
    overdueCalibrations: overdue,
    pmRatio: total ? Math.round((pm.length / total) * 100) : null,
    cmRatio: total ? Math.round((cm.length / total) * 100) : null,
    hasData: recs.length > 0 || hasInstruments,
  };
}
