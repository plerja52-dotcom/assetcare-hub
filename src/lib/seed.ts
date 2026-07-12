import type { Instrument, MaintenanceRecord, Settings } from "./types";

// Seed data intentionally left empty — app starts clean on every install.
// Defaults for settings (health thresholds, calibration intervals, escalation)
// live here because they are configuration, not user data.
export const defaultSettings: Settings = {
  instrumentTypes: [
    "Flow Meter",
    "Temperature Element",
    "Pressure Transmitter",
    "Control Valve",
    "Level Transmitter",
    "Gas Detector",
    "Analyzer",
  ],
  intervals: [
    { type: "Flow Meter", pmIntervalDays: 180, calibrationIntervalDays: 180 },
    { type: "Temperature Element", pmIntervalDays: 365, calibrationIntervalDays: 365 },
    { type: "Pressure Transmitter", pmIntervalDays: 180, calibrationIntervalDays: 180 },
    { type: "Control Valve", pmIntervalDays: 90, calibrationIntervalDays: 180 },
    { type: "Level Transmitter", pmIntervalDays: 180, calibrationIntervalDays: 180 },
    { type: "Gas Detector", pmIntervalDays: 90, calibrationIntervalDays: 90 },
    { type: "Analyzer", pmIntervalDays: 90, calibrationIntervalDays: 90 },
  ],
  calibrationTolerancePct: 2,
  healthExcellentMin: 90,
  healthFairMin: 70,
  escalation: [
    { criticality: "SCE", recipients: "" },
    { criticality: "High", recipients: "" },
    { criticality: "Medium", recipients: "" },
    { criticality: "Low", recipients: "" },
  ],
};

export const seedInstruments: Instrument[] = [];
export const seedMaintenance: MaintenanceRecord[] = [];
