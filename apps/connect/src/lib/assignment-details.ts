import type { StudentAssignment } from "@/lib/mock-data";
import { teachers } from "@/lib/mock-data";

export interface AssignmentAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  /** Demo download payload (plain text stand-in for PDF/doc). */
  content: string;
}

export type StudentAssignmentDetail = StudentAssignment & {
  description: string;
  instructions: string;
  teacherId: string;
  teacherName: string;
  attachments: AssignmentAttachment[];
  publishedAt?: string;
};

export function teacherForSubject(subject: string) {
  const match = teachers.find((t) => t.subject === subject);
  return match ?? { id: "T0", name: "Subject teacher", subject };
}

export function downloadAssignmentAttachment(file: AssignmentAttachment) {
  const blob = new Blob([file.content], { type: file.mimeType || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export const ASSIGNMENT_DETAIL_BY_ID: Record<
  string,
  Partial<Omit<StudentAssignmentDetail, keyof StudentAssignment>>
> = {
  A1: {
    description:
      "Practice problems covering quadratic equations, factorisation, and the quadratic formula from Chapter 4.",
    instructions:
      "Solve exercises 1–20 from the textbook. Show all working steps. You may submit typed PDF or clear photos of handwritten work.",
    teacherId: "T1",
    teacherName: "Ananya Iyer",
    publishedAt: "31 May 2026",
    attachments: [
      {
        id: "att-a1-1",
        fileName: "Quadratic_Equations_Worksheet.pdf",
        fileSize: "248 KB",
        mimeType: "application/pdf",
        content: "Quadratic Equations Practice — Exercises 1–20\n\nShow all working.\nDue: see portal.",
      },
      {
        id: "att-a1-2",
        fileName: "Chapter_4_Formula_Sheet.pdf",
        fileSize: "96 KB",
        mimeType: "application/pdf",
        content: "Formula sheet: quadratic formula, discriminant, vertex form.",
      },
    ],
  },
  A2: {
    description: "Worksheet on Newton's three laws of motion with numerical and conceptual questions.",
    instructions: "Answer all parts. Include units in numerical answers. Diagrams required for Q5–Q8.",
    teacherId: "T2",
    teacherName: "Rahul Verma",
    publishedAt: "30 May 2026",
    attachments: [
      {
        id: "att-a2-1",
        fileName: "Newtons_Laws_Worksheet.pdf",
        fileSize: "312 KB",
        mimeType: "application/pdf",
        content: "Newton's Laws Worksheet — Class 10-B Physics",
      },
    ],
  },
  A3: {
    description: "500-word essay on climate action initiatives in your community or school.",
    instructions:
      "Minimum 500 words. Use APA-style references. Submit as DOCX or PDF. Original work only — plagiarism checks apply.",
    teacherId: "T3",
    teacherName: "Priya Menon",
    publishedAt: "20 May 2026",
    attachments: [],
  },
  A4: {
    description: "Quiz preparation covering periodic table groups, atomic numbers, and element properties.",
    instructions: "Review the attached reference table. Be ready for a 20-minute in-class quiz.",
    teacherId: "T5",
    teacherName: "Neha Kapoor",
    publishedAt: "28 May 2026",
    attachments: [
      {
        id: "att-a4-1",
        fileName: "Periodic_Table_Reference.pdf",
        fileSize: "180 KB",
        mimeType: "application/pdf",
        content: "Periodic table reference — groups, periods, valency notes.",
      },
    ],
  },
  A5: {
    description: "Review sheet on trigonometric ratios, identities, and standard angles.",
    instructions: "Complete all problems. This was due last week — submit ASAP if still pending.",
    teacherId: "T1",
    teacherName: "Ananya Iyer",
    publishedAt: "22 May 2026",
    attachments: [
      {
        id: "att-a5-1",
        fileName: "Trigonometry_Review.pdf",
        fileSize: "205 KB",
        mimeType: "application/pdf",
        content: "Trigonometry review — sin, cos, tan for standard angles.",
      },
    ],
  },
  H1: {
    description: "Read Chapter 4 on organic chemistry fundamentals and prepare short notes.",
    instructions:
      "Read pages 78–92. Write 5 bullet-point takeaways in your notebook — photo optional for submission.",
    teacherId: "T5",
    teacherName: "Neha Kapoor",
    publishedAt: "1 Jun 2026",
    attachments: [],
  },
  H2: {
    description: "Grammar exercises from Unit 6 — tenses, subject–verb agreement, and punctuation.",
    instructions: "Complete exercises 6.1–6.4. Submit scanned pages or a single PDF.",
    teacherId: "T3",
    teacherName: "Priya Menon",
    publishedAt: "28 May 2026",
    attachments: [
      {
        id: "att-h2-1",
        fileName: "Unit_6_Grammar_Exercises.pdf",
        fileSize: "142 KB",
        mimeType: "application/pdf",
        content: "Unit 6 grammar exercises — tenses and agreement.",
      },
    ],
  },
  H3: {
    description: "Label major physiographic divisions on the map of India.",
    instructions:
      "Use the attached outline map. Colour-code mountains, plateaus, and plains. Submit clear photo or PDF.",
    teacherId: "T0",
    teacherName: "Geography faculty",
    publishedAt: "20 May 2026",
    attachments: [
      {
        id: "att-h3-1",
        fileName: "India_Physiography_Map.pdf",
        fileSize: "520 KB",
        mimeType: "application/pdf",
        content: "Outline map — India physiographic divisions for labeling.",
      },
    ],
  },
  H4: {
    description: "Daily problem set on vector addition, resolution, and dot product.",
    instructions: "Show vector diagrams for each problem. Due before next physics period.",
    teacherId: "T2",
    teacherName: "Rahul Verma",
    publishedAt: "31 May 2026",
    attachments: [
      {
        id: "att-h4-1",
        fileName: "Vectors_Problem_Set.pdf",
        fileSize: "168 KB",
        mimeType: "application/pdf",
        content: "Vectors problem set — addition and resolution.",
      },
    ],
  },
};

export function resolveAssignmentDetail(a: StudentAssignment): StudentAssignmentDetail {
  const extra = ASSIGNMENT_DETAIL_BY_ID[a.id];
  const teacher = extra?.teacherName
    ? { id: extra.teacherId ?? "T0", name: extra.teacherName }
    : teacherForSubject(a.subject);

  return {
    ...a,
    description: extra?.description ?? `${a.title} — work assigned for ${a.subject}.`,
    instructions:
      extra?.instructions ?? "Follow your teacher's instructions and submit before the due date.",
    teacherId: teacher.id,
    teacherName: teacher.name,
    attachments: extra?.attachments ?? [],
    publishedAt: extra?.publishedAt,
  };
}
