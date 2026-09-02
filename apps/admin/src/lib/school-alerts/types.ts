/** Mirrors backend school-alerts DTOs. */

export type SchoolAlertSeverity = "mandatory" | "emergency";

export type SchoolAlertCategory =
  | "absence"
  | "health"
  | "remark"
  | "safety"
  | "attendance"
  | "leave"
  | "holiday"
  | "closure"
  | "weather"
  | "general";

export type SchoolAlertAudience = "parents" | "students" | "parents_and_students";

export type AdminSchoolAlertDto = {
  id: string;
  instituteId: string;
  title: string;
  summary: string;
  detail: string;
  severity: SchoolAlertSeverity;
  category: SchoolAlertCategory;
  sourceLabel: string;
  studentId: string | null;
  recipientCount: number;
  createdAt: string;
  createdByUserId: string | null;
};

export type BroadcastSchoolAlertInput = {
  instituteId: string;
  title: string;
  summary?: string;
  detail?: string;
  severity?: SchoolAlertSeverity;
  category?: SchoolAlertCategory;
  sourceLabel?: string;
  studentId?: string | null;
  audience: SchoolAlertAudience;
};

export type BroadcastSchoolAlertResult = {
  alertId: string;
  recipientCount: number;
};
