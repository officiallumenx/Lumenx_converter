/** Attendance domain types aligned to attendance_config_version / register / mark. */

export type AttendanceMethod =
  | "daily"
  | "morning_first_period"
  | "morning_afternoon"
  | "period_wise";

export type AttendanceOwner =
  | "class_teacher"
  | "current_period_teacher"
  | "attendance_incharge";

export type AttendanceConfigScope = "institute" | "class" | "section";

export type AttendanceSlotKind = "day" | "morning" | "afternoon" | "period";

export type AttendanceRegisterStatus = "draft" | "submitted";

export type AttendanceMarkStatus = "present" | "absent" | "leave";

export type AttendanceConfigVersionRow = {
  id: string;
  institute_id: string;
  effective_from: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  class_codes: string[];
  section_codes: string[];
  created_by_user_profile_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AttendanceRegisterRow = {
  id: string;
  institute_id: string;
  academic_year_id: string;
  class_id: string;
  section_id: string;
  config_version_id: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  attendance_date: string;
  slot_kind: AttendanceSlotKind;
  slot_code: string;
  period_index: number | null;
  timetable_slot_id: string | null;
  slot_label: string;
  subject_label: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: AttendanceRegisterStatus;
  marked_by_teacher_id: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AttendanceMarkRow = {
  id: string;
  institute_id: string;
  register_id: string;
  student_id: string;
  enrollment_id: string;
  status: AttendanceMarkStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AttendanceConfigVersionDto = {
  id: string;
  instituteId: string;
  effectiveFrom: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  classCodes: string[];
  sectionCodes: string[];
  createdByUserProfileId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceMarkDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  status: AttendanceMarkStatus;
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRegisterDto = {
  id: string;
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  configVersionId: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  attendanceDate: string;
  slotKind: AttendanceSlotKind;
  slotCode: string;
  periodIndex: number | null;
  timetableSlotId: string | null;
  slotLabel: string;
  subjectLabel: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: AttendanceRegisterStatus;
  markedByTeacherId: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  marks?: AttendanceMarkDto[];
};

export type ExplicitMarkInput = {
  enrollmentId: string;
  status: AttendanceMarkStatus;
};

export type CreateRegisterInput = {
  instituteId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  configVersionId: string;
  attendanceDate: string;
  slotKind: AttendanceSlotKind;
  slotCode: string;
  periodIndex?: number | null;
  timetableSlotId?: string | null;
  slotLabel: string;
  subjectLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  marks: ExplicitMarkInput[];
};

export type UpdateRegisterInput = {
  marks?: ExplicitMarkInput[];
  slotLabel?: string;
  subjectLabel?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  periodIndex?: number | null;
  timetableSlotId?: string | null;
};

export type CreateConfigInput = {
  instituteId: string;
  effectiveFrom: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  classCodes?: string[];
  sectionCodes?: string[];
};

export type ListRegistersFilter = {
  instituteId: string;
  academicYearId?: string;
  sectionId?: string;
  attendanceDate?: string;
  status?: AttendanceRegisterStatus;
};
