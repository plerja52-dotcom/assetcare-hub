import type { Instrument, PmTaskRecord, ActivityType, TaskStatus } from "./types";

/**
 * Format-agnostic parsing for the real Area 2 PM/PdM tracker files.
 *
 * - Header row is rarely row 1 — scans the first ~20 rows for a plausible header.
 * - Fuzzy alias matching (case + punctuation insensitive).
 * - Auto-detects Instrument vs PM Task rows.
 * - Skips summary / task-list / checklist sheets gracefully.
 */

export type FieldKey =
  // Instrument
  | "tagNumber" | "lokasi" | "area" | "equipmentType" | "pmFrequency"
  // Task
  | "period" | "planDate" | "actualDate" | "pic"
  | "activity" | "activityType" | "kendala" | "status"
  | "perbaikanLanjutan" | "catatan";

export type RecordKind = "instrument" | "task";

const ALIASES: Record<FieldKey, string[]> = {
  tagNumber: ["tag number", "tag. number", "tag no", "no tag", "nomor tag", "tag", "tagname"],
  lokasi: ["lokasi", "location"],
  area: ["area", "unit"],
  equipmentType: ["equipment", "jenis", "tipe", "type", "instrument type"],
  pmFrequency: ["pm frequency", "frequency", "schedule", "interval"],
  period: ["period", "week", "minggu", "w"],
  planDate: ["plan", "plan date", "scheduled", "tanggal plan"],
  actualDate: ["actual", "actual date", "tanggal actual", "done date"],
  pic: ["pic", "pelaksana", "technician", "engineer", "by"],
  activity: ["activity", "aktivitas", "work done", "job description", "pekerjaan", "task"],
  activityType: ["activity type", "jenis kegiatan", "pm/cm", "pm cm"],
  kendala: ["kendala", "obstacle", "issue"],
  status: ["status", "state"],
  perbaikanLanjutan: ["perbaikan lanjutan", "follow up", "follow-up"],
  catatan: ["ket", "remark", "remarks", "catatan", "notes", "comment", "comments"],
};

// Note: 'evidence' was previously here — removed. Evidence is now a real
// captured field (see PmTaskRecord.evidence).
const IGNORE_HEADERS = new Set([
  "no.", "no", "nomor",
  // Single-letter checklist / initials columns
  "p", "k", "ma ii", "ma", "ws", "eie", "hse", "pe",
]);

const INSTRUMENT_ONLY: FieldKey[] = ["lokasi", "pmFrequency"];
const TASK_ONLY: FieldKey[] = [
  "planDate", "actualDate", "pic", "activity", "activityType",
  "kendala", "status", "perbaikanLanjutan", "period",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function guessField(header: string): FieldKey | null {
  const n = normalize(header);
  if (!n || IGNORE_HEADERS.has(n)) return null;
  for (const [key, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => normalize(a) === n)) return key;
  }
  for (const [key, aliases] of Object.entries(ALIASES) as [FieldKey, string[]][]) {
    if (aliases.some((a) => n.includes(normalize(a)) || normalize(a).includes(n))) return key;
  }
  return null;
}

/** Find the row most likely to be the real header by counting recognized fields. */
export function findHeaderRow(rows: unknown[][]): { index: number; headers: string[] } | null {
  const scanLimit = Math.min(20, rows.length);
  let best = { index: -1, score: 0, headers: [] as string[] };
  for (let i = 0; i < scanLimit; i++) {
    const row = (rows[i] ?? []).map((c) => String(c ?? "").trim());
    const nonEmpty = row.filter(Boolean);
    if (nonEmpty.length < 3) continue;
    let score = 0;
    for (const cell of row) if (guessField(cell)) score++;
    if (score > best.score) best = { index: i, score, headers: row };
  }
  return best.score >= 3 ? { index: best.index, headers: best.headers } : null;
}

export interface ColumnMapping {
  header: string;
  field: FieldKey | null;
}

export function buildMapping(headers: string[]): ColumnMapping[] {
  const used = new Set<FieldKey>();
  return headers.map((h) => {
    const g = guessField(h);
    if (g && !used.has(g)) { used.add(g); return { header: h, field: g }; }
    return { header: h, field: null };
  });
}

export function detectKind(mapping: ColumnMapping[]): RecordKind {
  const fields = new Set(mapping.map((m) => m.field).filter(Boolean) as FieldKey[]);
  const t = TASK_ONLY.reduce((n, k) => n + (fields.has(k) ? 1 : 0), 0);
  const i = INSTRUMENT_ONLY.reduce((n, k) => n + (fields.has(k) ? 1 : 0), 0);
  if (t >= 2) return "task";
  if (fields.has("planDate") || fields.has("activity") || fields.has("pic")) return "task";
  return i > 0 || fields.has("tagNumber") ? "instrument" : "instrument";
}

/** Heuristic: a sheet is "not record data" if it has few recognized columns
 * or its title suggests summary/task-list content. */
export function isNonRecordSheet(sheetName: string, mapping: ColumnMapping[] | null): string | null {
  const n = normalize(sheetName);
  if (/(progress|summary|rekap|total)/.test(n)) return `Sheet "${sheetName}" looks like a summary sheet — skipped.`;
  if (/(task list|checklist|instruction|panduan)/.test(n))
    return `Sheet "${sheetName}" looks like a task-list/checklist template — skipped.`;
  if (!mapping) return `Sheet "${sheetName}" has no recognizable header row — skipped.`;
  const recognized = mapping.filter((m) => m.field).length;
  if (recognized < 2) return `Sheet "${sheetName}" has too few recognizable columns — skipped.`;
  return null;
}

function str(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).trim();
  return s === "" ? undefined : s;
}
function coerceDate(v: unknown): string | undefined {
  if (v == null || v === "") return undefined;
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const n = Number(s);
  if (!isNaN(n) && n > 20000 && n < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + n * 86400000).toISOString().slice(0, 10);
  }
  const parsed = Date.parse(s);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + Number(y) : Number(y);
    return new Date(year, Number(mo) - 1, Number(d)).toISOString().slice(0, 10);
  }
  return undefined;
}
function coerceActivityType(v: unknown, fallback: ActivityType = "PM"): ActivityType {
  const s = normalize(String(v ?? ""));
  if (!s) return fallback;
  if (s.includes("pdm")) return "PdM";
  if (s.includes("perbaikan") || s.includes("cm") || s.includes("corr")) return "Perbaikan";
  if (s.includes("pm") || s.includes("prev")) return "PM";
  return fallback;
}
function coerceStatus(v: unknown): TaskStatus | undefined {
  const s = normalize(String(v ?? ""));
  if (!s) return undefined;
  if (s.includes("finish") || s.includes("selesai") || s.includes("done") || s.includes("close")) return "Finish";
  if (s.includes("progress") || s.includes("dikerjakan") || s.includes("ongoing")) return "Inprogress";
  if (s.includes("behind") || s.includes("terlambat") || s.includes("overdue") || s.includes("late")) return "Behind";
  if (s.includes("schedule") || s.includes("planned") || s.includes("rencana")) return "Scheduled";
  return undefined;
}
function coerceFrequency(v: unknown): { count: number; unit: "minggu" | "bulan" | "tahun" } | undefined {
  const s = normalize(String(v ?? ""));
  if (!s) return undefined;
  const m = s.match(/(\d+)\s*(minggu|bulan|tahun|week|month|year)/);
  if (!m) return undefined;
  const u = m[2].startsWith("mi") || m[2].startsWith("we") ? "minggu"
          : m[2].startsWith("b")  || m[2].startsWith("mo") ? "bulan" : "tahun";
  return { count: Math.max(1, Number(m[1]) || 1), unit: u };
}

export interface ParsedInstrumentRow { kind: "instrument"; data: Partial<Instrument>; errors: string[]; valid: boolean; }
export interface ParsedTaskRow      { kind: "task";       data: Partial<PmTaskRecord>; errors: string[]; valid: boolean; }
export type ParsedRow = ParsedInstrumentRow | ParsedTaskRow;

export function applyMapping(
  rawRows: Record<string, unknown>[],
  mapping: ColumnMapping[],
  kind: RecordKind,
  sheetActivityType?: ActivityType,
): ParsedRow[] {
  return rawRows
    .map((raw) => {
      const picked: Partial<Record<FieldKey, unknown>> = {};
      for (const m of mapping) if (m.field) picked[m.field] = raw[m.header];
      if (kind === "instrument") return buildInstrument(picked);
      return buildTask(picked, sheetActivityType);
    })
    .filter((r) => Object.values(r.data).some((v) => v !== undefined && v !== ""));
}

function buildInstrument(p: Partial<Record<FieldKey, unknown>>): ParsedInstrumentRow {
  const data: Partial<Instrument> = {
    tagNumber: str(p.tagNumber),
    lokasi: str(p.lokasi),
    area: str(p.area) ?? "",
    equipmentType: str(p.equipmentType) ?? "",
    pmFrequency: coerceFrequency(p.pmFrequency),
  };
  const errors: string[] = [];
  if (!data.tagNumber) errors.push("Tag Number required");
  if (!data.area)      errors.push("Area required");
  if (!data.equipmentType) errors.push("Equipment required");
  return { kind: "instrument", data, errors, valid: errors.length === 0 };
}

function buildTask(p: Partial<Record<FieldKey, unknown>>, sheetActivityType?: ActivityType): ParsedTaskRow {
  const data: Partial<PmTaskRecord> = {
    tagNumber: str(p.tagNumber),
    area: str(p.area) ?? "",
    equipmentType: str(p.equipmentType) ?? "",
    period: str(p.period),
    planDate: coerceDate(p.planDate),
    actualDate: coerceDate(p.actualDate),
    pic: str(p.pic) ?? "",
    activity: str(p.activity) ?? "",
    activityType: coerceActivityType(p.activityType, sheetActivityType ?? "PM"),
    kendala: str(p.kendala),
    status: coerceStatus(p.status),
    perbaikanLanjutan: str(p.perbaikanLanjutan),
    catatan: str(p.catatan),
  };
  const errors: string[] = [];
  if (!data.tagNumber) errors.push("Tag Number required");
  if (!data.planDate)  errors.push("Plan Date required");
  return { kind: "task", data, errors, valid: errors.length === 0 };
}
