export type ClearanceStatus = "cleared" | "restricted" | "pending" | "not_cleared";

export type InjuryStatus = "active" | "recovering" | "recovered";

export type InjurySeverity = "minor" | "moderate" | "severe";

export type FitnessMetricKey = "bmi" | "strength" | "endurance" | "speed" | "flexibility";

export type MedicalFitnessViewTab = "students" | "coach" | "parent";

export interface MedicalHistoryItem {
  id: string;
  condition: string;
  diagnosedDate: string;
  notes?: string;
  ongoing: boolean;
}

export interface InjuryRecord {
  id: string;
  injuryType: string;
  bodyPart: string;
  severity: InjurySeverity;
  occurredOn: string;
  status: InjuryStatus;
  recoveryNotes?: string;
  expectedReturnDate?: string;
}

export interface FitnessTestResult {
  id: string;
  metric: FitnessMetricKey;
  value: number;
  unit: string;
  testedAt: string;
  notes?: string;
}

export interface FitnessMetricSnapshot {
  value: number;
  unit: string;
  testedAt: string;
}

export interface CoachMedicalView {
  medicalNotes: string;
  restrictions: string[];
  recommendations: string[];
  lastUpdatedBy: string;
  lastUpdatedAt: string;
}

export interface StudentFitnessProfile {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  teamName?: string;
  clearanceStatus: ClearanceStatus;
  clearanceDate?: string;
  clearanceNotes?: string;
  medicalHistory: MedicalHistoryItem[];
  injuries: InjuryRecord[];
  fitnessTests: FitnessTestResult[];
  latestMetrics: Record<FitnessMetricKey, FitnessMetricSnapshot | null>;
  coachView: CoachMedicalView;
  createdAt: string;
  updatedAt: string;
}

export interface MedicalHistoryInput {
  condition: string;
  diagnosedDate: string;
  notes?: string;
  ongoing: boolean;
}

export interface InjuryInput {
  injuryType: string;
  bodyPart: string;
  severity: InjurySeverity;
  occurredOn: string;
  recoveryNotes?: string;
  expectedReturnDate?: string;
}

export interface FitnessTestInput {
  metric: FitnessMetricKey;
  value: number;
  testedAt: string;
  notes?: string;
}

export interface ClearanceInput {
  clearanceStatus: ClearanceStatus;
  clearanceDate?: string;
  clearanceNotes?: string;
}

export interface CoachMedicalInput {
  medicalNotes: string;
  restrictions: string[];
  recommendations: string[];
  lastUpdatedBy: string;
}

export type FitnessSortField = "student" | "clearance" | "updatedAt";

export interface FitnessListFilters {
  query?: string;
  clearanceStatus?: ClearanceStatus | "all";
  hasActiveInjury?: boolean | "all";
  sortBy?: FitnessSortField;
  sortDir?: "asc" | "desc";
}

export const FITNESS_METRIC_LABELS: Record<FitnessMetricKey, string> = {
  bmi: "BMI",
  strength: "Strength",
  endurance: "Endurance",
  speed: "Speed",
  flexibility: "Flexibility",
};

export const FITNESS_METRIC_UNITS: Record<FitnessMetricKey, string> = {
  bmi: "kg/m²",
  strength: "kg",
  endurance: "min",
  speed: "sec",
  flexibility: "cm",
};

export const CLEARANCE_STATUS_LABELS: Record<ClearanceStatus, string> = {
  cleared: "Cleared",
  restricted: "Restricted",
  pending: "Pending Review",
  not_cleared: "Not Cleared",
};

export const INJURY_STATUS_LABELS: Record<InjuryStatus, string> = {
  active: "Active",
  recovering: "Recovering",
  recovered: "Recovered",
};

export const INJURY_SEVERITY_LABELS: Record<InjurySeverity, string> = {
  minor: "Minor",
  moderate: "Moderate",
  severe: "Severe",
};

export const MEDICAL_FITNESS_TAB_LABELS: Record<MedicalFitnessViewTab, string> = {
  students: "Student Fitness",
  coach: "Coach View",
  parent: "Parent View",
};
