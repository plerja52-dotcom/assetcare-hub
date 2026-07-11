export type Criticality = "High" | "Medium" | "Low" | "SCE";
export type MaintenanceType = "PM" | "CM";
export type FinalStatus =
  | "Online/Normal"
  | "Calibration Due"
  | "Maintenance Required"
  | "Draft";

export interface Instrument {
  id: string;
  tagNumber: string;
  name: string;
  location: string;
  type: string;
  criticality: Criticality;
  commissioningDate?: string; // ISO
  runningHours?: number;
}

export interface MaintenanceRecord {
  id: string;
  instrumentId: string; // FK -> instrument.id
  tagNumber: string; // denormalized for easy display
  dateTime: string; // ISO
  type: MaintenanceType;
  activity: string;
  finalStatus: FinalStatus;
  failureMode?: string; // for CM
  repairTimeHours?: number;
  downtimeHours?: number;
  calibrationBefore?: number;
  calibrationAfter?: number;
  technician: string;
  notes?: string;
}

export interface IntervalRule {
  type: string; // instrument type
  pmIntervalDays: number;
  calibrationIntervalDays: number;
}

export interface EscalationRule {
  criticality: Criticality;
  recipients: string; // comma separated
}

export interface Settings {
  instrumentTypes: string[];
  intervals: IntervalRule[];
  calibrationTolerancePct: number;
  healthExcellentMin: number; // e.g. 90
  healthFairMin: number; // e.g. 70
  escalation: EscalationRule[];
}
