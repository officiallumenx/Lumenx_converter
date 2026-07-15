/** Centralized audit & activity log (demo). */

export type AuditModule =
  | "Attendance"
  | "Marks"
  | "Students"
  | "Teachers"
  | "Admissions"
  | "Fees"
  | "Leave"
  | "Complaints"
  | "Notifications"
  | "Documents";

export type AuditStatus = "success" | "warning" | "info" | "error";

export type AuditEntry = {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  module: AuditModule;
  status: AuditStatus;
  at: string;
  atSort: string;
};

export const AUDIT_MODULES: AuditModule[] = [
  "Attendance",
  "Marks",
  "Students",
  "Teachers",
  "Admissions",
  "Fees",
  "Leave",
  "Complaints",
  "Notifications",
  "Documents",
];

const SEED: AuditEntry[] = [
  {
    id: "AUD-1001",
    user: "Marcus Whitfield",
    role: "Coordinator",
    action: "Updated attendance",
    target: "Grade 10-B · 4 Jun 2026",
    module: "Attendance",
    status: "success",
    at: "Today · 09:14",
    atSort: "2026-06-20T09:14:00",
  },
  {
    id: "AUD-1000",
    user: "Sarah Jenkins",
    role: "Academic Faculty",
    action: "Published marks",
    target: "MTH-101 · Mid-term",
    module: "Marks",
    status: "success",
    at: "Today · 08:52",
    atSort: "2026-06-20T08:52:00",
  },
  {
    id: "AUD-999",
    user: "Admin R. Chen",
    role: "Admissions Officer",
    action: "Approved admission",
    target: "Application #ADM-4421",
    module: "Admissions",
    status: "success",
    at: "Today · 08:30",
    atSort: "2026-06-20T08:30:00",
  },
  {
    id: "AUD-998",
    user: "Dr. Alistair Vance",
    role: "Principal",
    action: "Approved leave",
    target: "Sarah Jenkins · TLR-042",
    module: "Leave",
    status: "info",
    at: "Yesterday · 17:05",
    atSort: "2026-06-19T17:05:00",
  },
  {
    id: "AUD-997",
    user: "Front Office",
    role: "Coordinator",
    action: "Created student",
    target: "Rahul Verma · Grade 9-A",
    module: "Students",
    status: "success",
    at: "Yesterday · 15:22",
    atSort: "2026-06-19T15:22:00",
  },
  {
    id: "AUD-996",
    user: "HR · Priya Nair",
    role: "HR",
    action: "Created teacher",
    target: "Liang Ortega · Chemistry",
    module: "Teachers",
    status: "success",
    at: "Yesterday · 14:10",
    atSort: "2026-06-19T14:10:00",
  },
  {
    id: "AUD-995",
    user: "Accounts · Meera",
    role: "Accountant",
    action: "Updated fee record",
    target: "Term 2 · Grade 11 batch",
    module: "Fees",
    status: "warning",
    at: "Yesterday · 11:40",
    atSort: "2026-06-19T11:40:00",
  },
  {
    id: "AUD-994",
    user: "Sub-Admin",
    role: "Vice Principal",
    action: "Escalated complaint",
    target: "#CMP-2104 · Lab safety",
    module: "Complaints",
    status: "error",
    at: "19 Jun · 16:18",
    atSort: "2026-06-19T16:18:00",
  },
  {
    id: "AUD-993",
    user: "Communications",
    role: "Coordinator",
    action: "Published notification",
    target: "Parent alert · Transport delay",
    module: "Notifications",
    status: "info",
    at: "19 Jun · 10:05",
    atSort: "2026-06-19T10:05:00",
  },
  {
    id: "AUD-992",
    user: "Records · Anita",
    role: "Front Office",
    action: "Verified document",
    target: "Bonafide · Aanya Sharma",
    module: "Documents",
    status: "success",
    at: "18 Jun · 13:44",
    atSort: "2026-06-18T13:44:00",
  },
  {
    id: "AUD-991",
    user: "Dr. Alistair Vance",
    role: "Principal",
    action: "Rejected leave",
    target: "David Koal · TLR-040",
    module: "Leave",
    status: "warning",
    at: "18 Jun · 09:12",
    atSort: "2026-06-18T09:12:00",
  },
  {
    id: "AUD-990",
    user: "Sarah Jenkins",
    role: "Academic Faculty",
    action: "Updated marks",
    target: "PHY-220 · Unit Test 3",
    module: "Marks",
    status: "success",
    at: "17 Jun · 15:30",
    atSort: "2026-06-17T15:30:00",
  },
];

export function getAuditLog(): AuditEntry[] {
  return [...SEED].sort((a, b) => b.atSort.localeCompare(a.atSort));
}

export function filterAuditLog(
  entries: AuditEntry[],
  q: string,
  module: AuditModule | "all",
  status: AuditStatus | "all",
): AuditEntry[] {
  return entries.filter((e) => {
    if (module !== "all" && e.module !== module) return false;
    if (status !== "all" && e.status !== status) return false;
    if (!q.trim()) return true;
    const hay = `${e.user} ${e.action} ${e.target} ${e.module} ${e.role}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
}
