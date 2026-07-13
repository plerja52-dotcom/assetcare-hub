import type { Instrument, MaintenanceRecord, Criticality, MaintenanceType, FinalStatus } from "./types";

/**
 * Smart, format-agnostic parsing of arbitrary tabular data (CSV/XLSX/DOCX rows).
 *
 * - Fuzzy header detection via alias tables (case + punctuation-insensitive).
 * - Auto-detects whether a row-set is Instrument master data or Maintenance records
 *   from which fields are present.
 * - Returns a structured mapping so the UI can show a "Confirm Column Mapping" step.
 */

export type FieldKey =
  // Instrument fields
  | "tagNumber"
  | "name"
  | "location"
  | "type"
  | "criticality"
  | "commissioningDate"
  // Maintenance fields
  | "dateTime"
  | "maintenanceType"
  | "activity"
  | "finalStatus"
  | "failureMode"
  | "repairTimeHours"
  | "downtimeHours"
  | "calibrationBefore"
  | "calibrationAfter"
  | "technician"
  | "notes";

export type RecordKind = "instrument" | "maintenance";

const ALIASES: Record<FieldKey, string[]> = {
  tagNumber: ["tag number", "tag", "tag no", "tagno", "asset tag", "instrument tag", "tagname", "tag id"],
  name: ["name", "instrument name", "description", "instrument description", "equipment name"],
  location: ["location", "unit", "area", "plant unit", "process unit", "site"],
  type: ["type", "instrument type", "category", "kind"],
  criticality: ["criticality", "critical", "criticality level", "severity", "risk level"],
  commissioningDate: [
    "commissioning date", "commission date", "install date", "installation date",
    "in service date", "start date",
  ],

  dateTime: [
    "date time", "datetime", "date", "timestamp", "date and time",
    "maintenance date", "record date", "activity date", "work date",
  ],
  maintenanceType: [
    "type", "maintenance type", "mtype", "work type", "job type", "pm cm",
    "pm/cm", "activity type",
  ],
  activity: ["activity", "work description", "job", "task", "action", "work performed"],
  finalStatus: ["status", "final status", "result", "condition"],
  failureMode: ["failure mode", "root cause", "cause", "failure", "problem", "fault"],
  repairTimeHours: ["repair time", "repair hours", "repair time hours", "ttr", "time to repair"],
  downtimeHours: ["downtime", "downtime hours", "down time", "outage hours"],
  calibrationBefore: [
    "calibration before", "cal before", "before calibration", "as found",
    "as-found", "as found (%)",
  ],
  calibrationAfter: [
    "calibration after", "cal after", "after calibration", "as left",
    "as-left", "as left (%)",
  ],
  technician: ["technician", "engineer", "performed by", "by", "operator", "assignee"],
  notes: ["notes", "remarks", "comment", "comments", "description2"],
};

// Fields that are ONLY meaningful on one record kind — used to auto-classify.
const INSTRUMENT_ONLY: FieldKey[] = ["criticality", "commissioningDate", "location"];
const MAINT_ONLY: FieldKey[] = [
  "maintenanceType", "activity", "finalStatus", "failureMode",
  "repairTimeHours", "downtimeHours", "calibrationBefore", "calibrationAfter",
  "technician", "dateTime",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** For a given source header, return the FieldKey best matched via alias list. */
export function guessField(header: string): FieldKey | null {
  const n = normalize(header);
  if (!n) return null;
  // Exact alias match first
  for (const [key, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => normalize(a) === n)) return key;
  }
  // Contains match as fallback
  for (const [key, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => n.includes(normalize(a)) || normalize(a).includes(n))) {
      return key;
    }
  }
  return null;
}

export interface ColumnMapping {
  header: string;
  field: FieldKey | null; // null = Ignore
}

export function buildMapping(headers: string[]): ColumnMapping[] {
  const mapping: ColumnMapping[] = [];
  const used = new Set<FieldKey>();
  for (const h of headers) {
    const g = guessField(h);
    // Don't collide — if the same field is guessed twice, keep only the first mapping.
    if (g && !used.has(g)) {
      used.add(g);
      mapping.push({ header: h, field: g });
    } else {
      mapping.push({ header: h, field: null });
    }
  }
  return mapping;
}

export function detectKind(mapping: ColumnMapping[]): RecordKind {
  const fields = new Set(mapping.map((m) => m.field).filter(Boolean) as FieldKey[]);
  const mScore = MAINT_ONLY.reduce((n, k) => n + (fields.has(k) ? 1 : 0), 0);
  const iScore = INSTRUMENT_ONLY.reduce((n, k) => n + (fields.has(k) ? 1 : 0), 0);
  // Strong maintenance signals dominate — a maintenance table often also has tag/name.
  if (mScore >= 2) return "maintenance";
  if (fields.has("activity") || fields.has("maintenanceType")) return "maintenance";
  return iScore > 0 || fields.has("tagNumber") ? "instrument" : "instrument";
}

function coerceCriticality(v: unknown): Criticality {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.startsWith("sce")) return "SCE";
  if (s.startsWith("h")) return "High";
  if (s.startsWith("l")) return "Low";
  return "Medium";
}

function coerceMaintType(v: unknown): MaintenanceType | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.startsWith("pm") || s.startsWith("prev")) return "PM";
  if (s.startsWith("cm") || s.startsWith("corr")) return "CM";
  return null;
}

function coerceStatus(v: unknown): FinalStatus {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.includes("draft")) return "Draft";
  if (s.includes("maint")) return "Maintenance Required";
  if (s.includes("cal")) return "Calibration Due";
  return "Online/Normal";
}

function coerceDate(v: unknown): string | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString();
  const s = String(v).trim();
  // Excel serial number
  const n = Number(s);
  if (!isNaN(n) && n > 20000 && n < 80000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + n * 86400000).toISOString();
  }
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return new Date(parsed).toISOString();
  // Common dd/mm/yyyy fallback
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return new Date(year, Number(mo) - 1, Number(d)).toISOString();
  }
  return undefined;
}

function num(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(String(v).replace(/,/g, "."));
  return isNaN(n) ? undefined : n;
}

function str(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}

export interface ParsedInstrumentRow {
  kind: "instrument";
  data: Partial<Instrument>;
  errors: string[];
  valid: boolean;
}
export interface ParsedMaintenanceRow {
  kind: "maintenance";
  data: Partial<MaintenanceRecord>;
  errors: string[];
  valid: boolean;
}
export type ParsedRow = ParsedInstrumentRow | ParsedMaintenanceRow;

export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  kind: RecordKind,
): ParsedRow[] {
  return rawRows
    .map((raw) => {
      const picked: Partial<Record<FieldKey, unknown>> = {};
      for (const m of mapping) {
        if (!m.field) continue;
        picked[m.field] = raw[m.header];
      }
      if (kind === "instrument") return buildInstrument(picked);
      return buildMaintenance(picked);
    })
    .filter((r) => {
      // drop entirely empty rows
      const has = Object.values(r.data).some((v) => v !== undefined && v !== "");
      return has;
    });
}

function buildInstrument(p: Partial<Record<FieldKey, unknown>>): ParsedInstrumentRow {
  const data: Partial<Instrument> = {
    tagNumber: str(p.tagNumber),
    name: str(p.name),
    location: str(p.location),
    type: str(p.type),
    criticality: p.criticality != null ? coerceCriticality(p.criticality) : "Medium",
    commissioningDate: coerceDate(p.commissioningDate),
  };
  const errors: string[] = [];
  if (!data.tagNumber) errors.push("Tag required");
  if (!data.name) errors.push("Name required");
  return { kind: "instrument", data, errors, valid: errors.length === 0 };
}

function buildMaintenance(p: Partial<Record<FieldKey, unknown>>): ParsedMaintenanceRow {
  const mtype = coerceMaintType(p.maintenanceType);
  const data: Partial<MaintenanceRecord> = {
    tagNumber: str(p.tagNumber),
    dateTime: coerceDate(p.dateTime),
    type: mtype ?? undefined,
    activity: str(p.activity),
    finalStatus: coerceStatus(p.finalStatus),
    failureMode: str(p.failureMode),
    repairTimeHours: num(p.repairTimeHours),
    downtimeHours: num(p.downtimeHours),
    calibrationBefore: num(p.calibrationBefore),
    calibrationAfter: num(p.calibrationAfter),
    technician: str(p.technician) ?? "—",
    notes: str(p.notes),
  };
  const errors: string[] = [];
  if (!data.tagNumber) errors.push("Tag required");
  if (!data.dateTime) errors.push("Date required");
  if (!data.type) errors.push("PM/CM type required");
  return { kind: "maintenance", data, errors, valid: errors.length === 0 };
}

export const ALL_FIELDS: { key: FieldKey; label: string; group: RecordKind }[] = [
  { key: "tagNumber", label: "Tag Number", group: "instrument" },
  { key: "name", label: "Name", group: "instrument" },
  { key: "location", label: "Location / Unit", group: "instrument" },
  { key: "type", label: "Type", group: "instrument" },
  { key: "criticality", label: "Criticality", group: "instrument" },
  { key: "commissioningDate", label: "Commissioning Date", group: "instrument" },
  { key: "dateTime", label: "Date / Time", group: "maintenance" },
  { key: "maintenanceType", label: "PM / CM Type", group: "maintenance" },
  { key: "activity", label: "Activity", group: "maintenance" },
  { key: "finalStatus", label: "Final Status", group: "maintenance" },
  { key: "failureMode", label: "Failure Mode", group: "maintenance" },
  { key: "repairTimeHours", label: "Repair Time (h)", group: "maintenance" },
  { key: "downtimeHours", label: "Downtime (h)", group: "maintenance" },
  { key: "calibrationBefore", label: "Calibration Before (%)", group: "maintenance" },
  { key: "calibrationAfter", label: "Calibration After (%)", group: "maintenance" },
  { key: "technician", label: "Technician", group: "maintenance" },
  { key: "notes", label: "Notes", group: "maintenance" },
];
