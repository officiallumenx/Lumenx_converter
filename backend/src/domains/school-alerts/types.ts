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

export type SchoolAlertRow = {
  id: string;
  institute_id: string;
  title: string;
  summary: string;
  detail: string;
  severity: SchoolAlertSeverity;
  category: string;
  source_label: string;
  student_id: string | null;
  rule_id: string | null;
  created_by_user_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SchoolAlertRecipientRow = {
  id: string;
  institute_id: string;
  school_alert_id: string;
  user_profile_id: string;
  student_id: string | null;
  read_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PortalSchoolAlertDto = {
  id: string;
  instituteId: string;
  title: string;
  summary: string;
  detail: string;
  severity: SchoolAlertSeverity;
  category: SchoolAlertCategory;
  source: string;
  studentId: string | null;
  childName: string | null;
  time: string;
  unread: boolean;
  acknowledged: boolean;
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
  audience: "parents" | "students" | "parents_and_students";
};

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
