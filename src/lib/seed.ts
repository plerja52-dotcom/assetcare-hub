import type { Instrument, PmTaskRecord, Settings } from "./types";

// Real-world equipment types seen in the Area 2 PM/PdM tracker.
const EQUIPMENT_TYPES = [
  "Junction Box",
  "Control Valve",
  "Transmitter",
  "PSA Unit",
  "Local Panel",
  "Switch",
  "Vibration Monitor",
];

// Areas as they appear in the real files — mix of numeric and short codes.
const AREAS = ["12", "14", "22", "AHU", "HTU", "DHC"];

export const defaultSettings: Settings = {
  areas: AREAS,
  equipmentTypes: EQUIPMENT_TYPES,
  frequencyByType: {
    "Junction Box":       { count: 1, unit: "tahun" },
    "Control Valve":      { count: 6, unit: "bulan" },
    "Transmitter":        { count: 1, unit: "tahun" },
    "PSA Unit":           { count: 3, unit: "bulan" },
    "Local Panel":        { count: 1, unit: "tahun" },
    "Switch":             { count: 1, unit: "tahun" },
    "Vibration Monitor":  { count: 1, unit: "bulan" },
  },
  upcomingWindowDays: 14,
  escalation: AREAS.map((a) => ({ area: a, recipients: "" })),
};

export const seedInstruments: Instrument[] = [];
export const seedTasks: PmTaskRecord[] = [];
