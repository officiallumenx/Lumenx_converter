import type { VisualTemplateFields, VisualThemeId } from "./types";

export type VisualThemeMeta = {
  id: VisualThemeId;
  label: string;
  description: string;
  forKinds: Array<"certificate" | "report" | "id_card" | "document">;
};

export const VISUAL_THEMES: VisualThemeMeta[] = [
  {
    id: "achievement_elegant",
    label: "Achievement — Elegant",
    description: "Decorative corners, script name, gold seal — like formal award certificates",
    forKinds: ["certificate"],
  },
  {
    id: "bonafide_ornate",
    label: "Bonafide — Ornate border",
    description: "Double gold border with crest and official wording",
    forKinds: ["certificate", "document"],
  },
  {
    id: "conduct_classic",
    label: "Conduct — Classic green",
    description: "Forest green frame with shield emblem",
    forKinds: ["certificate"],
  },
  {
    id: "sports_medal",
    label: "Sports — Medal ribbon",
    description: "Dynamic red-orange layout with medal graphic",
    forKinds: ["certificate"],
  },
  {
    id: "science_modern",
    label: "Science Fair — Modern",
    description: "Purple-teal geometric accents for STEM events",
    forKinds: ["certificate"],
  },
  {
    id: "participation_colorful",
    label: "Participation — Colorful",
    description: "Bright multi-color bands for extra-curricular events",
    forKinds: ["certificate"],
  },
  {
    id: "transfer_official",
    label: "Transfer — Board official",
    description: "Government-style TC with watermark and record table",
    forKinds: ["document"],
  },
  {
    id: "report_card_modern",
    label: "Progress Report — Modern",
    description: "Clean academic report with subject grade table",
    forKinds: ["report"],
  },
  {
    id: "annual_report_formal",
    label: "Annual Report — Formal",
    description: "Full-year summary with attendance block",
    forKinds: ["report"],
  },
  {
    id: "marksheet_grid",
    label: "Mark Sheet — Grid",
    description: "Semester marks grid with totals row",
    forKinds: ["document"],
  },
  {
    id: "student_id_blue",
    label: "Student ID — Blue stripe",
    description: "PVC card with photo, barcode, and institute stripe",
    forKinds: ["id_card"],
  },
  {
    id: "teacher_id_professional",
    label: "Teacher ID — Professional",
    description: "Staff card with photo and department strip",
    forKinds: ["id_card"],
  },
];

export function defaultVisualFields(
  theme: VisualThemeId,
  instituteName: string,
  principalName: string,
): VisualTemplateFields {
  const base: VisualTemplateFields = {
    titleMain: "CERTIFICATE",
    titleSub: "OF ACHIEVEMENT",
    presentationLine: "This Certificate is Presented To :",
    bodyText:
      "In recognition of outstanding dedication and excellence. {{StudentName}} of Class {{Class}}-{{Section}} has demonstrated remarkable achievement in {{EventName}} during the academic year {{AcademicYear}} at {{InstituteName}}.",
    showStudentPhoto: true,
    studentPhotoUrl: "",
    signatoryLeftName: principalName.toUpperCase(),
    signatoryLeftTitle: "PRINCIPAL",
    signatoryRightName: "CLASS TEACHER",
    signatoryRightTitle: "REPRESENTATIVE",
  };

  switch (theme) {
    case "achievement_elegant":
      return base;
    case "bonafide_ornate":
      return {
        ...base,
        titleMain: "BONAFIDE",
        titleSub: "CERTIFICATE",
        presentationLine: "This is to certify that",
        bodyText:
          "{{StudentName}}, admission no. {{AdmissionNumber}}, is a bonafide student of {{InstituteName}}, studying in Class {{Class}}-{{Section}} for the academic year {{AcademicYear}}.",
        showStudentPhoto: false,
        signatoryRightTitle: "REGISTRAR",
      };
    case "conduct_classic":
      return {
        ...base,
        titleMain: "CERTIFICATE",
        titleSub: "OF GOOD CONDUCT",
        presentationLine: "This is to certify that",
        bodyText:
          "{{StudentName}} of Class {{Class}}-{{Section}} has exhibited exemplary character and conduct throughout {{AcademicYear}} at {{InstituteName}}.",
        showStudentPhoto: false,
      };
    case "sports_medal":
      return {
        ...base,
        titleMain: "CERTIFICATE",
        titleSub: "OF EXCELLENCE IN SPORTS",
        presentationLine: "Awarded with pride to",
        bodyText:
          "{{StudentName}} for outstanding performance in {{EventName}} — {{Achievement}}. Presented on {{IssueDate}} at {{InstituteName}}.",
        showStudentPhoto: true,
        signatoryRightName: "SPORTS DIRECTOR",
        signatoryRightTitle: "REPRESENTATIVE",
      };
    case "science_modern":
      return {
        ...base,
        titleMain: "CERTIFICATE",
        titleSub: "OF PARTICIPATION",
        presentationLine: "This certifies that",
        bodyText:
          "{{StudentName}} successfully participated in {{EventName}} and presented an innovative project during {{AcademicYear}} at {{InstituteName}}.",
        showStudentPhoto: true,
      };
    case "participation_colorful":
      return {
        ...base,
        titleMain: "CERTIFICATE",
        titleSub: "OF PARTICIPATION",
        presentationLine: "Proudly presented to",
        bodyText:
          "{{StudentName}} for active participation in {{EventName}} organized by {{InstituteName}}.",
        showStudentPhoto: true,
      };
    case "transfer_official":
      return {
        ...base,
        titleMain: "TRANSFER",
        titleSub: "CERTIFICATE",
        presentationLine: "Certified that",
        bodyText:
          "{{StudentName}}, son/daughter of {{ParentName}}, bearing admission no. {{AdmissionNumber}}, was a student of Class {{Class}}-{{Section}} at {{InstituteName}} during {{AcademicYear}}. Character and conduct: Good.",
        showStudentPhoto: false,
        signatoryLeftTitle: "PRINCIPAL",
        signatoryRightName: "HEAD CLERK",
        signatoryRightTitle: "OFFICE SEAL",
      };
    case "report_card_modern":
      return {
        ...base,
        titleMain: "PROGRESS",
        titleSub: "REPORT",
        presentationLine: "Student",
        bodyText:
          "{{StudentName}} · Class {{Class}}-{{Section}} · Roll {{RollNumber}} · {{AcademicYear}} · {{InstituteName}}",
        showStudentPhoto: true,
        signatoryLeftTitle: "CLASS TEACHER",
        signatoryRightTitle: "PRINCIPAL",
      };
    case "annual_report_formal":
      return {
        ...base,
        titleMain: "ANNUAL",
        titleSub: "REPORT CARD",
        presentationLine: "Academic year summary for",
        bodyText:
          "{{StudentName}}, Class {{Class}}-{{Section}}, {{InstituteName}}. Academic Year {{AcademicYear}}.",
        showStudentPhoto: true,
      };
    case "marksheet_grid":
      return {
        ...base,
        titleMain: "STATEMENT",
        titleSub: "OF MARKS",
        presentationLine: "Candidate",
        bodyText:
          "{{StudentName}} · Admission {{AdmissionNumber}} · Class {{Class}}-{{Section}} · {{InstituteName}}",
        showStudentPhoto: false,
        signatoryLeftTitle: "CONTROLLER OF EXAMS",
        signatoryRightTitle: "PRINCIPAL",
      };
    case "student_id_blue":
      return {
        ...base,
        titleMain: instituteName.toUpperCase(),
        titleSub: "STUDENT IDENTITY CARD",
        presentationLine: "",
        bodyText: "{{StudentName}} · Class {{Class}}-{{Section}} · {{AdmissionNumber}}",
        showStudentPhoto: true,
        signatoryLeftName: "",
        signatoryLeftTitle: "",
        signatoryRightName: "",
        signatoryRightTitle: "",
      };
    case "teacher_id_professional":
      return {
        ...base,
        titleMain: instituteName.toUpperCase(),
        titleSub: "FACULTY ID CARD",
        presentationLine: "",
        bodyText: "{{TeacherName}} · Faculty · Valid {{AcademicYear}}",
        showStudentPhoto: true,
        signatoryLeftName: "",
        signatoryLeftTitle: "",
        signatoryRightName: "",
        signatoryRightTitle: "",
      };
    default:
      return base;
  }
}

export function themeForCategory(categoryId: string): VisualThemeId {
  const map: Record<string, VisualThemeId> = {
    bonafide_certificate: "bonafide_ornate",
    study_certificate: "bonafide_ornate",
    conduct_certificate: "conduct_classic",
    transfer_certificate: "transfer_official",
    migration_certificate: "transfer_official",
    academic_excellence: "achievement_elegant",
    attendance_excellence: "achievement_elegant",
    top_performer: "achievement_elegant",
    sports_winner: "sports_medal",
    sports_participation: "participation_colorful",
    sports_runner_up: "sports_medal",
    sports_achievement: "sports_medal",
    science_fair: "science_modern",
    dance: "participation_colorful",
    music: "participation_colorful",
    drama: "participation_colorful",
    art: "participation_colorful",
    progress_reports: "report_card_modern",
    semester_reports: "report_card_modern",
    annual_reports: "annual_report_formal",
    mark_sheets: "marksheet_grid",
    student_id: "student_id_blue",
    teacher_id: "teacher_id_professional",
    staff_id: "teacher_id_professional",
    visitor_pass: "student_id_blue",
  };
  return map[categoryId] ?? "achievement_elegant";
}
