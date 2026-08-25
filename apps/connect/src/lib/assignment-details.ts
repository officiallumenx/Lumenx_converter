import type { StudentAssignment } from "@/lib/mock-data";
import { teachers } from "@/lib/mock-data";
import { downloadBlobToDevice, downloadDataUrlToDevice } from "@lumenx/utils";

export interface AssignmentAttachment {
  id: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  /** Demo download payload (plain text stand-in for PDF/doc). */
  content: string;
  /** Real uploaded file (data URL) from simplified homework upload. */
  dataUrl?: string;
}

export type StudentAssignmentDetail = StudentAssignment & {
  description: string;
  instructions: string;
  teacherId: string;
  teacherName: string;
  attachments: AssignmentAttachment[];
  publishedAt?: string;
};

const DETAIL_EXTRAS_KEY = "lumenx.assignment-detail-extras.v1";
const STUDENT_OVERLAY_KEY = "lumenx.student-assignment-overlay.v1";

type AssignmentDetailExtra = Partial<
  Omit<StudentAssignmentDetail, keyof StudentAssignment>
>;

function loadDetailExtras(): Record<string, AssignmentDetailExtra> {
  try {
    const raw = localStorage.getItem(DETAIL_EXTRAS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, AssignmentDetailExtra>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveDetailExtras(map: Record<string, AssignmentDetailExtra>) {
  try {
    localStorage.setItem(DETAIL_EXTRAS_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function upsertAssignmentDetailExtra(id: string, patch: AssignmentDetailExtra) {
  const map = loadDetailExtras();
  map[id] = { ...map[id], ...patch };
  saveDetailExtras(map);
}

export function loadStudentAssignmentOverlays(): StudentAssignment[] {
  try {
    const raw = localStorage.getItem(STUDENT_OVERLAY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudentAssignment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertStudentAssignmentOverlay(assignment: StudentAssignment) {
  const list = loadStudentAssignmentOverlays().filter((a) => a.id !== assignment.id);
  list.unshift(assignment);
  try {
    localStorage.setItem(STUDENT_OVERLAY_KEY, JSON.stringify(list.slice(0, 80)));
  } catch {
    /* ignore */
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

export function attachmentFromSimpleUpload(input: {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}): AssignmentAttachment {
  return {
    id: `att-${Date.now()}`,
    fileName: input.fileName,
    fileSize: formatFileSize(input.size),
    mimeType: input.mimeType,
    content: input.fileName,
    dataUrl: input.dataUrl,
  };
}

export function teacherForSubject(subject: string) {
  const match = teachers.find((t) => t.subject === subject);
  return match ?? { id: "T0", name: "Subject teacher", subject };
}

function downloadFromDataUrl(file: AssignmentAttachment) {
  if (!file.dataUrl) return false;
  downloadDataUrlToDevice(file.fileName, file.dataUrl);
  return true;
}

export function downloadAssignmentAttachment(file: AssignmentAttachment) {
  if (downloadFromDataUrl(file)) return;
  const blob = new Blob([file.content], { type: file.mimeType || "application/octet-stream" });
  downloadBlobToDevice(file.fileName, blob);
}

export function openAssignmentAttachment(file: AssignmentAttachment) {
  if (file.dataUrl) {
    window.open(file.dataUrl, "_blank", "noopener,noreferrer");
    return;
  }
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function defaultAttachments(a: StudentAssignment, instructions: string): AssignmentAttachment[] {
  const safeName = a.title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") || "Worksheet";
  return [
    {
      id: `att-${a.id}-sheet`,
      fileName: `${safeName}.pdf`,
      fileSize: "128 KB",
      mimeType: "application/pdf",
      content: `${a.title}\n\nSubject: ${a.subject}\nClass: ${a.class}\nDue: ${a.due}\n\nInstructions:\n${instructions}`,
    },
  ];
}

export const ASSIGNMENT_DETAIL_BY_ID: Record<
  string,
  Partial<Omit<StudentAssignmentDetail, keyof StudentAssignment>>
> = {
  A1: {
    description:
      "Practice problems covering quadratic equations, factorisation, and the quadratic formula from Chapter 4.",
    instructions:
      "Solve exercises 1–20 from the textbook. Show all working steps in your notebook.",
    teacherId: "T1",
    teacherName: "Ananya Iyer",
    publishedAt: "31 May 2026",
    attachments: [
      {
        id: "att-a1-1",
        fileName: "Quadratic_Equations_Worksheet.pdf",
        fileSize: "248 KB",
        mimeType: "application/pdf",
        content:
          "Quadratic Equations Practice — Exercises 1–20\n\nShow all working.\nDue: see portal.",
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
    description:
      "Worksheet on Newton's three laws of motion with numerical and conceptual questions.",
    instructions:
      "Answer all parts. Include units in numerical answers. Diagrams required for Q5–Q8.",
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
      "Minimum 500 words. Use APA-style references. Write in your notebook or on ruled sheets. Original work only.",
    teacherId: "T3",
    teacherName: "Priya Menon",
    publishedAt: "20 May 2026",
    attachments: [],
  },
  A4: {
    description:
      "Quiz preparation covering periodic table groups, atomic numbers, and element properties.",
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
    instructions: "Complete all problems. This was due last week — finish and hand in at school as soon as possible.",
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
      "Read pages 78–92. Write 5 bullet-point takeaways in your notebook.",
    teacherId: "T5",
    teacherName: "Neha Kapoor",
    publishedAt: "1 Jun 2026",
    attachments: [],
  },
  H2: {
    description: "Grammar exercises from Unit 6 — tenses, subject–verb agreement, and punctuation.",
    instructions: "Complete exercises 6.1–6.4 in your notebook and hand in at school.",
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
      "Use the attached outline map. Colour-code mountains, plateaus, and plains. Bring the completed map to class.",
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
  "A-TODAY": {
    description: "Revision worksheet on quadratic graphs, roots, and turning points.",
    instructions: "Complete all graph sketches. Label axes and key points clearly.",
    teacherId: "T1",
    teacherName: "Ananya Iyer",
    publishedAt: "Today",
    attachments: [
      {
        id: "att-a-today-1",
        fileName: "Quadratic_Graphs_Today.pdf",
        fileSize: "196 KB",
        mimeType: "application/pdf",
        content: "Algebra revision — quadratic graphs worksheet for Class 10-B.",
      },
    ],
  },
  "H-TODAY": {
    description: "Reading comprehension passage with inference and vocabulary questions.",
    instructions: "Read the passage twice. Answer all questions in complete sentences.",
    teacherId: "T3",
    teacherName: "Priya Menon",
    publishedAt: "Today",
    attachments: [
      {
        id: "att-h-today-1",
        fileName: "Reading_Comprehension_Ch12.pdf",
        fileSize: "154 KB",
        mimeType: "application/pdf",
        content: "Reading comprehension — Chapter 12 passage and questions.",
      },
    ],
  },
};

export function resolveAssignmentDetail(a: StudentAssignment): StudentAssignmentDetail {
  const stored = loadDetailExtras()[a.id];
  const extra = { ...ASSIGNMENT_DETAIL_BY_ID[a.id], ...stored };
  const teacher = extra?.teacherName
    ? { id: extra.teacherId ?? "T0", name: extra.teacherName }
    : teacherForSubject(a.subject);

  const description = extra?.description ?? `${a.title} — work assigned for ${a.subject}.`;
  const instructions =
    extra?.instructions ??
    "Follow your teacher's instructions and hand in the work at school before the due date.";
  const attachments =
    extra && Object.prototype.hasOwnProperty.call(extra, "attachments")
      ? (extra.attachments ?? [])
      : defaultAttachments(a, instructions);

  return {
    ...a,
    description,
    instructions,
    teacherId: teacher.id,
    teacherName: teacher.name,
    attachments,
    publishedAt: extra?.publishedAt,
  };
}
