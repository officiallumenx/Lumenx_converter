import type { TemplateCategoryGroup, TemplateVariable } from "./types";

export const TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: "StudentName", label: "Student name", sample: "Aanya Sharma" },
  { key: "AdmissionNumber", label: "Admission number", sample: "ADM-2024-1042" },
  { key: "Class", label: "Class", sample: "10" },
  { key: "Section", label: "Section", sample: "A" },
  { key: "AcademicYear", label: "Academic year", sample: "2025–2026" },
  { key: "IssueDate", label: "Issue date", sample: "20 Jun 2026" },
  { key: "EventName", label: "Event name", sample: "Annual Sports Meet" },
  { key: "Achievement", label: "Achievement", sample: "Gold Medal — 100m Sprint" },
  { key: "InstituteName", label: "Institute name", sample: "LumenX International School" },
  { key: "TeacherName", label: "Teacher name", sample: "Dr. Priya Menon" },
  { key: "CertificateNumber", label: "Certificate number", sample: "LXA/CERT/2026/0142" },
  { key: "PrincipalName", label: "Principal name", sample: "Dr. Alistair Vance" },
  { key: "RollNumber", label: "Roll number", sample: "1042" },
  { key: "ParentName", label: "Parent name", sample: "Rajesh Sharma" },
];

export const TEMPLATE_CATEGORY_GROUPS: TemplateCategoryGroup[] = [
  {
    id: "academic",
    label: "Academic",
    items: [
      { id: "progress_reports", label: "Progress Reports" },
      { id: "semester_reports", label: "Semester Reports" },
      { id: "annual_reports", label: "Annual Reports" },
      { id: "mark_sheets", label: "Mark Sheets" },
    ],
  },
  {
    id: "certificates",
    label: "Certificates",
    items: [
      { id: "study_certificate", label: "Study Certificate" },
      { id: "bonafide_certificate", label: "Bonafide Certificate" },
      { id: "conduct_certificate", label: "Conduct Certificate" },
      { id: "transfer_certificate", label: "Transfer Certificate" },
      { id: "migration_certificate", label: "Migration Certificate" },
    ],
  },
  {
    id: "achievements",
    label: "Achievements",
    items: [
      { id: "academic_excellence", label: "Academic Excellence" },
      { id: "attendance_excellence", label: "Attendance Excellence" },
      { id: "top_performer", label: "Top Performer" },
    ],
  },
  {
    id: "sports",
    label: "Sports",
    items: [
      { id: "sports_participation", label: "Participation" },
      { id: "sports_winner", label: "Winner" },
      { id: "sports_runner_up", label: "Runner Up" },
      { id: "sports_achievement", label: "Achievement" },
    ],
  },
  {
    id: "extra_curricular",
    label: "Extra-Curricular",
    items: [
      { id: "dance", label: "Dance" },
      { id: "music", label: "Music" },
      { id: "drama", label: "Drama" },
      { id: "art", label: "Art" },
      { id: "quiz", label: "Quiz" },
      { id: "debate", label: "Debate" },
      { id: "science_fair", label: "Science Fair" },
      { id: "club_activities", label: "Club Activities" },
    ],
  },
  {
    id: "identity",
    label: "Identity",
    items: [
      { id: "student_id", label: "Student ID" },
      { id: "teacher_id", label: "Teacher ID" },
      { id: "visitor_pass", label: "Visitor Pass" },
      { id: "staff_id", label: "Staff ID" },
    ],
  },
];

export function categoryLabel(categoryId: string): string {
  for (const group of TEMPLATE_CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.id === categoryId);
    if (item) return item.label;
  }
  return categoryId;
}

export function groupLabelForCategory(categoryId: string): string {
  for (const group of TEMPLATE_CATEGORY_GROUPS) {
    if (group.items.some((i) => i.id === categoryId)) return group.label;
  }
  return "General";
}
