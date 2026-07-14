// New canonical data model — mirrors the real Maintenance Area 2 PM/PdM tracker files.
// Fields intentionally dropped from the old model: criticality, runningHours, health-score,
// calibrationBefore/After, calibrationTolerance, failureMode, repairTimeHours, downtimeHours.

export type FrequencyUnit = "minggu" | "bulan" | "tahun";

export interface PmFrequency {
  count: number;
  unit: FrequencyUnit;
}

export interface Instrument {
  id: string;
  tagNumber: string;      // e.g. "12-JS-007"
  lokasi?: string;        // optional descriptive location
  area: string;           // "12", "14", "22", "AHU", "HTU", "DHC"
  equipmentType: string;  // "Junction Box", "Control Valve", ...
  pmFrequency?: PmFrequency;
  commissioningDate?: string;
  createdBy?: string;     // user display name
  createdAt?: string;     // ISO
}

export type TaskStatus = "Finish" | "Inprogress" | "Behind" | "Scheduled";
export type ActivityType = "PM" | "PdM" | "Perbaikan";

export interface PmTaskRecord {
  id: string;
  instrumentId: string;
  tagNumber: string;
  area: string;
  equipmentType: string;
  period?: string;            // W1..W4 optional
  planDate: string;           // ISO date (day)
  actualDate?: string;        // ISO date (day) — presence drives Finish
  pic: string;                // person in charge
  activity: string;
  activityType: ActivityType; // default PM
  kendala?: string;
  status: TaskStatus;
  manualStatus?: boolean;     // when user forces Inprogress
  perbaikanLanjutan?: string;
  catatan?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface EscalationRule {
  area: string;         // keyed off Area (org unit)
  recipients: string;   // comma-separated
}

export interface Settings {
  areas: string[];
  equipmentTypes: string[];
  frequencyByType: Record<string, PmFrequency>;
  upcomingWindowDays: number; // "due soon" horizon
  escalation: EscalationRule[];
}
