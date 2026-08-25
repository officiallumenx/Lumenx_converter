import type { CertificateCatalogField, CertificateFieldSource } from "./field-types";

export const CERTIFICATE_FIELD_SOURCES: {
  id: CertificateFieldSource;
  label: string;
}[] = [
  { id: "student", label: "Student" },
  { id: "teacher", label: "Teacher" },
  { id: "institute", label: "Institute" },
  { id: "academic", label: "Academic" },
  { id: "sports", label: "Sports" },
  { id: "cultural", label: "Cultural Activities" },
  { id: "events", label: "Events" },
];

function field(
  source: CertificateFieldSource,
  key: string,
  displayName: string,
  defaultRequired = false,
): CertificateCatalogField {
  const dataField = `${source}.${key}`;
  return {
    id: dataField,
    source,
    displayName,
    dataField,
    defaultRequired,
  };
}

/**
 * Certificate Field Catalog — relevant fields only, not a full database dump.
 */
export const CERTIFICATE_FIELD_CATALOG: CertificateCatalogField[] = [
  field("student", "name", "Student Name", true),
  field("student", "firstName", "First Name"),
  field("student", "surname", "Surname"),
  field("student", "admissionNumber", "Admission Number", true),
  field("student", "rollNumber", "Roll Number"),
  field("student", "class", "Class", true),
  field("student", "section", "Section"),
  field("student", "dateOfBirth", "Date of Birth"),
  field("student", "parentName", "Parent Name"),

  field("teacher", "name", "Teacher Name", true),
  field("teacher", "employeeId", "Employee ID"),
  field("teacher", "department", "Department"),
  field("teacher", "designation", "Designation"),

  field("institute", "name", "Institute Name", true),
  field("institute", "address", "Institute Address"),
  field("institute", "principalName", "Principal Name"),
  field("institute", "issueDate", "Issue Date"),
  field("institute", "certificateNumber", "Certificate Number"),

  field("academic", "academicYear", "Academic Year", true),
  field("academic", "class", "Class"),
  field("academic", "section", "Section"),
  field("academic", "subject", "Subject"),
  field("academic", "examName", "Exam Name"),
  field("academic", "result", "Result / Grade"),
  field("academic", "percentage", "Percentage"),
  field("academic", "attendancePercent", "Attendance %"),

  field("sports", "sportName", "Sport Name", true),
  field("sports", "meetName", "Sports Meet Name"),
  field("sports", "category", "Age / Weight Category"),
  field("sports", "position", "Position / Result"),
  field("sports", "achievement", "Achievement"),

  field("cultural", "activityName", "Activity Name", true),
  field("cultural", "eventName", "Cultural Event Name"),
  field("cultural", "role", "Role / Performance"),
  field("cultural", "prize", "Prize / Position"),

  field("events", "eventName", "Event Name", true),
  field("events", "eventDate", "Event Date"),
  field("events", "venue", "Venue"),
  field("events", "role", "Participant Role"),
];

export function listCertificateFieldsBySource(
  source: CertificateFieldSource,
): CertificateCatalogField[] {
  return CERTIFICATE_FIELD_CATALOG.filter((item) => item.source === source);
}

export function getCertificateCatalogField(
  id: string,
): CertificateCatalogField | undefined {
  return CERTIFICATE_FIELD_CATALOG.find((item) => item.id === id);
}

/**
 * Student identity / result fields stay per student.
 * Event-level fields (sport name, meet name, etc.) can be applied to a batch.
 */
const STUDENT_SPECIFIC_DATA_FIELDS = new Set([
  "academic.class",
  "academic.section",
  "academic.result",
  "academic.percentage",
  "academic.attendancePercent",
  "sports.position",
  "sports.achievement",
  "cultural.role",
  "cultural.prize",
  "events.role",
  "institute.certificateNumber",
]);

export function isCertificateFieldStudentSpecific(dataFieldId: string): boolean {
  const field = getCertificateCatalogField(dataFieldId);
  if (!field) return true;
  if (field.source === "student") return true;
  return STUDENT_SPECIFIC_DATA_FIELDS.has(field.dataField);
}

export function certificateFieldSourceLabel(source: CertificateFieldSource): string {
  return CERTIFICATE_FIELD_SOURCES.find((item) => item.id === source)?.label ?? source;
}
