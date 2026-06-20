import {
  ADMISSION_APPLICATIONS,
  CAREER_CANDIDATES,
  CAREER_JOBS,
  FEE_STUDENTS,
  MARK_ROWS,
  TRANSPORT_ROUTES,
} from "@/lib/admin-module-data";
import type { REPORT_CATALOG } from "@/lib/admin-module-data";

export type ReportId = (typeof REPORT_CATALOG)[number]["id"];
export type ExportFormat = "csv" | "pdf";

export type RecentExport = {
  id: string;
  reportId: ReportId;
  reportName: string;
  format: ExportFormat;
  filename: string;
  rowCount: number;
  exportedAt: string;
};

const RECENT_KEY = "lumenx-admin-recent-exports";
const MAX_RECENT = 8;

const STUDENT_ROSTER = [
  { studentId: "STU-1042", name: "Aanya Sharma", grade: "Grade 10", section: "A", gender: "F", parent: "Raj Sharma", phone: "+91 98765 10042", attendancePct: 96 },
  { studentId: "STU-1043", name: "Ethan Wright", grade: "Grade 10", section: "A", gender: "M", parent: "Lisa Wright", phone: "+91 98765 10043", attendancePct: 88 },
  { studentId: "STU-1046", name: "Alina Moreno", grade: "Grade 9", section: "A", gender: "F", parent: "Carlos Moreno", phone: "+91 98765 10046", attendancePct: 71 },
  { studentId: "STU-1047", name: "Marcus Lee", grade: "Grade 11", section: "A", gender: "M", parent: "Jen Lee", phone: "+91 98765 10047", attendancePct: 94 },
  { studentId: "STU-1048", name: "Priya Patel", grade: "Grade 9", section: "B", gender: "F", parent: "Amit Patel", phone: "+91 98765 10048", attendancePct: 92 },
  { studentId: "STU-1049", name: "Sana Khan", grade: "Grade 11", section: "A", gender: "F", parent: "Omar Khan", phone: "+91 98765 10049", attendancePct: 97 },
];

const TEACHER_ROSTER = [
  { employeeId: "EMP-1041", name: "Sarah Jenkins", department: "Mathematics", email: "s.jenkins@institute.edu", sections: "10-A, 10-B, 11-A", status: "Active" },
  { employeeId: "EMP-1042", name: "David Koal", department: "Physics", email: "d.koal@institute.edu", sections: "11-A, 11-B, 12-A", status: "Active" },
  { employeeId: "EMP-1043", name: "Priya Iyer", department: "Biology", email: "p.iyer@institute.edu", sections: "9-A, 9-B", status: "Active" },
  { employeeId: "EMP-1044", name: "Marcus Whitfield", department: "English", email: "m.whitfield@institute.edu", sections: "11-C", status: "Active" },
  { employeeId: "EMP-1045", name: "Hana Suzuki", department: "Chemistry", email: "h.suzuki@institute.edu", sections: "10-A", status: "On leave" },
];

const ATTENDANCE_MONTHLY = [
  { month: "May 2026", classSection: "Grade 10-A", schoolDays: 22, present: 836, absent: 44, ratePct: 95 },
  { month: "May 2026", classSection: "Grade 10-B", schoolDays: 22, present: 798, absent: 70, ratePct: 92 },
  { month: "May 2026", classSection: "Grade 11-A", schoolDays: 22, present: 820, absent: 62, ratePct: 93 },
  { month: "May 2026", classSection: "Grade 11-C", schoolDays: 22, present: 712, absent: 80, ratePct: 90 },
  { month: "May 2026", classSection: "Grade 9-A", schoolDays: 22, present: 690, absent: 98, ratePct: 88 },
  { month: "May 2026", classSection: "Grade 9-B", schoolDays: 22, present: 705, absent: 85, ratePct: 89 },
];

const COMPLAINTS_EXPORT = [
  { id: "CMP-201", title: "Broken HVAC in Block B", from: "Prof. Sterling", priority: "P0", status: "pending", opened: "2026-06-02", slaHours: 4 },
  { id: "CMP-200", title: "Bullying incident — Grade 9-B", from: "Anonymous Parent", priority: "P0", status: "review", opened: "2026-06-02", slaHours: 12 },
  { id: "CMP-199", title: "Cafeteria food quality", from: "Student Council", priority: "P2", status: "pending", opened: "2026-06-01", slaHours: 48 },
  { id: "CMP-198", title: "Transport delays — Route 7", from: "K. Patel", priority: "P1", status: "review", opened: "2026-06-01", slaHours: 24 },
  { id: "CMP-197", title: "Library access request", from: "External Research", priority: "P3", status: "resolved", opened: "2026-05-30", slaHours: 72 },
];

const EVENTS_PARTICIPATION = [
  { event: "Annual Science Symposium", date: "2026-05-22", audience: "All grades", rsvp: 412, attended: 398, ratePct: 97 },
  { event: "Parent–Teacher Conference", date: "2026-05-24", audience: "Parents Grade 10–12", rsvp: 198, attended: 176, ratePct: 89 },
  { event: "Mid-Term Exams Begin", date: "2026-05-27", audience: "Grade 9–12", rsvp: 0, attended: 2842, ratePct: 100 },
  { event: "Inter-house Sports Meet", date: "2026-06-06", audience: "All grades", rsvp: 1240, attended: 0, ratePct: 0 },
];

type ReportDataset = {
  title: string;
  institute: string;
  generatedAt: string;
  headers: string[];
  rows: Record<string, string | number>[];
  summary?: string;
};

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function csvCell(value: string | number) {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function datasetToCsv(data: ReportDataset) {
  const lines = [
    `# ${data.title}`,
    `# Institute: ${data.institute}`,
    `# Generated: ${data.generatedAt}`,
    ...(data.summary ? [`# ${data.summary}`] : []),
    "",
    data.headers.join(","),
    ...data.rows.map((row) => data.headers.map((h) => csvCell(row[h] ?? "")).join(",")),
  ];
  return lines.join("\r\n");
}

function datasetToHtml(data: ReportDataset) {
  const headCells = data.headers.map((h) => `<th>${h}</th>`).join("");
  const bodyRows = data.rows
    .map(
      (row) =>
        `<tr>${data.headers.map((h) => `<td>${String(row[h] ?? "")}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${data.title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111; }
    h1 { font-size: 1.25rem; margin: 0 0 0.25rem; }
    .meta { font-size: 0.8rem; color: #555; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
    th, td { border: 1px solid #ccc; padding: 0.5rem 0.65rem; text-align: left; }
    th { background: #f4f4f5; }
    tr:nth-child(even) { background: #fafafa; }
    @media print { body { margin: 1rem; } }
  </style>
</head>
<body>
  <h1>${data.title}</h1>
  <p class="meta">${data.institute} · Generated ${data.generatedAt}${data.summary ? ` · ${data.summary}` : ""}</p>
  <table><thead><tr>${headCells}</tr></thead><tbody>${bodyRows}</tbody></table>
  <p class="meta" style="margin-top:2rem">LumenX Admin · demo export · use Print → Save as PDF</p>
</body>
</html>`;
}

function getDataset(reportId: ReportId): ReportDataset {
  const generatedAt = new Date().toLocaleString();
  const institute = "LumenX Model Institute";

  switch (reportId) {
    case "students":
      return {
        title: "Student roster & demographics",
        institute,
        generatedAt,
        summary: `${STUDENT_ROSTER.length} students (demo sample)`,
        headers: ["studentId", "name", "grade", "section", "gender", "parent", "phone", "attendancePct"],
        rows: STUDENT_ROSTER,
      };
    case "teachers":
      return {
        title: "Faculty directory & assignments",
        institute,
        generatedAt,
        summary: `${TEACHER_ROSTER.length} faculty (demo sample)`,
        headers: ["employeeId", "name", "department", "email", "sections", "status"],
        rows: TEACHER_ROSTER,
      };
    case "attendance":
      return {
        title: "Monthly attendance register",
        institute,
        generatedAt,
        summary: "May 2026 · class-level aggregates",
        headers: ["month", "classSection", "schoolDays", "present", "absent", "ratePct"],
        rows: ATTENDANCE_MONTHLY,
      };
    case "marks": {
      const headers = ["rollNo", "name", "classGrade", "section", "examId", "total", "maxTotal", "percent"];
      const rows = MARK_ROWS.map((m) => {
        const total = Object.values(m.marks).reduce((a, b) => a + b, 0);
        const maxTotal = Object.keys(m.marks).length * m.maxPerSubject;
        return {
          rollNo: m.rollNo,
          name: m.name,
          classGrade: m.classGrade,
          section: m.section,
          examId: m.examId,
          total,
          maxTotal,
          percent: Math.round((total / maxTotal) * 100),
        };
      });
      return {
        title: "Exam results by class",
        institute,
        generatedAt,
        summary: `${rows.length} mark rows`,
        headers,
        rows,
      };
    }
    case "transport":
      return {
        title: "Route ridership & compliance",
        institute,
        generatedAt,
        headers: ["id", "code", "name", "stops", "students", "driver", "vehicle", "morning", "status"],
        rows: TRANSPORT_ROUTES.map((r) => ({
          id: r.id,
          code: r.code,
          name: r.name,
          stops: r.stops,
          students: r.students,
          driver: r.driver,
          vehicle: r.vehicle,
          morning: r.morning,
          status: r.status,
        })),
      };
    case "admissions":
      return {
        title: "Application funnel",
        institute,
        generatedAt,
        headers: ["id", "name", "grade", "stage", "applied", "docs"],
        rows: ADMISSION_APPLICATIONS.map((a) => ({
          id: a.id,
          name: a.name,
          grade: a.grade,
          stage: a.stage,
          applied: a.applied,
          docs: a.docs,
        })),
      };
    case "careers":
      return {
        title: "Hiring pipeline",
        institute,
        generatedAt,
        summary: `${CAREER_JOBS.length} open roles · ${CAREER_CANDIDATES.length} candidates`,
        headers: ["candidateId", "name", "job", "stage", "score"],
        rows: CAREER_CANDIDATES.map((c) => ({
          candidateId: c.id,
          name: c.name,
          job: c.job,
          stage: c.stage,
          score: c.score,
        })),
      };
    case "complaints":
      return {
        title: "SLA & resolution summary",
        institute,
        generatedAt,
        headers: ["id", "title", "from", "priority", "status", "opened", "slaHours"],
        rows: COMPLAINTS_EXPORT,
      };
    case "fees":
      return {
        title: "Collection & defaulters",
        institute,
        generatedAt,
        headers: ["studentId", "name", "class", "totalInr", "paidInr", "balanceInr", "status"],
        rows: FEE_STUDENTS.map((f) => ({
          studentId: f.id,
          name: f.name,
          class: f.class,
          totalInr: f.total,
          paidInr: f.paid,
          balanceInr: f.total - f.paid,
          status: f.status,
        })),
      };
    case "events":
      return {
        title: "Event participation",
        institute,
        generatedAt,
        headers: ["event", "date", "audience", "rsvp", "attended", "ratePct"],
        rows: EVENTS_PARTICIPATION,
      };
    default:
      return {
        title: "Report",
        institute,
        generatedAt,
        headers: ["note"],
        rows: [{ note: "Unknown report" }],
      };
  }
}

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadReport(
  reportId: ReportId,
  reportName: string,
  format: ExportFormat,
): { filename: string; rowCount: number } {
  const data = getDataset(reportId);
  const datePart = new Date().toISOString().slice(0, 10);
  const base = `lumenx-${slug(reportName)}-${datePart}`;

  if (format === "csv") {
    const filename = `${base}.csv`;
    triggerDownload(filename, datasetToCsv(data), "text/csv;charset=utf-8");
    return { filename, rowCount: data.rows.length };
  }

  const filename = `${base}.html`;
  triggerDownload(filename, datasetToHtml(data), "text/html;charset=utf-8");
  return { filename, rowCount: data.rows.length };
}

export function loadRecentExports(): RecentExport[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentExport[];
  } catch {
    return [];
  }
}

export function pushRecentExport(entry: Omit<RecentExport, "id" | "exportedAt">) {
  const item: RecentExport = {
    ...entry,
    id: String(Date.now()),
    exportedAt: new Date().toISOString(),
  };
  const prev = loadRecentExports().filter((e) => !(e.reportId === item.reportId && e.format === item.format));
  const next = [item, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
