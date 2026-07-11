import type { Instrument, MaintenanceRecord, Settings } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

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
    { criticality: "SCE", recipients: "hse.lead@pertamina, area2.super@pertamina" },
    { criticality: "High", recipients: "area2.super@pertamina" },
    { criticality: "Medium", recipients: "reliability@pertamina" },
    { criticality: "Low", recipients: "reliability@pertamina" },
  ],
};

const units = ["CDU", "NHDT", "RCC", "LPG Recovery", "Utilities", "Sour Water"];
const types = defaultSettings.instrumentTypes;
const criticalities: Instrument["criticality"][] = ["High", "Medium", "Low", "SCE"];

export const seedInstruments: Instrument[] = Array.from({ length: 24 }).map(
  (_, i) => {
    const type = types[i % types.length];
    const prefix =
      type === "Flow Meter"
        ? "FT"
        : type === "Temperature Element"
          ? "TE"
          : type === "Pressure Transmitter"
            ? "PT"
            : type === "Control Valve"
              ? "FV"
              : type === "Level Transmitter"
                ? "LT"
                : type === "Gas Detector"
                  ? "GD"
                  : "AT";
    const unit = units[i % units.length];
    const commissioningYear = 2015 + (i % 8);
    return {
      id: uid(),
      tagNumber: `${prefix}-${1000 + i}`,
      name: `${type} ${i + 1}`,
      location: unit,
      type,
      criticality: criticalities[i % criticalities.length],
      commissioningDate: `${commissioningYear}-03-15`,
      runningHours: 8000 + i * 250,
    };
  },
);

const activitiesPM = ["Calibration", "Loop Test", "Wiring Check", "Visual Inspection"];
const activitiesCM = ["Sensor Replacement", "Valve Overhaul", "Wiring Repair", "Recalibration"];
const failureModes = ["Calibration Drift", "Sensor Failure", "Valve Stuck", "Corrosion", "Signal Loss"];
const technicians = ["A. Wibowo", "R. Sinaga", "F. Pratama", "N. Yuliani", "D. Halim"];

const now = new Date();
export const seedMaintenance: MaintenanceRecord[] = [];
seedInstruments.forEach((ins, idx) => {
  const events = 2 + (idx % 3);
  for (let e = 0; e < events; e++) {
    const daysAgo = 15 + e * 45 + (idx % 10) * 3;
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    const isCM = (idx + e) % 4 === 0;
    seedMaintenance.push({
      id: uid(),
      instrumentId: ins.id,
      tagNumber: ins.tagNumber,
      dateTime: d.toISOString(),
      type: isCM ? "CM" : "PM",
      activity: isCM
        ? activitiesCM[(idx + e) % activitiesCM.length]
        : activitiesPM[(idx + e) % activitiesPM.length],
      finalStatus: isCM
        ? e === 0
          ? "Maintenance Required"
          : "Online/Normal"
        : "Online/Normal",
      failureMode: isCM ? failureModes[(idx + e) % failureModes.length] : undefined,
      repairTimeHours: isCM ? 2 + ((idx + e) % 6) : 1 + ((idx + e) % 3),
      downtimeHours: isCM ? 3 + ((idx + e) % 8) : 0,
      calibrationBefore: isCM ? undefined : 1.2 + (e % 3) * 0.3,
      calibrationAfter: isCM ? undefined : 0.2 + (e % 2) * 0.1,
      technician: technicians[(idx + e) % technicians.length],
    });
  }
});
