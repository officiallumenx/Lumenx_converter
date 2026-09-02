import type { TeacherComplaint } from "@/lib/teacher/types";
import type {
  ComplaintDestination,
  ComplaintDto,
  ComplaintPriority,
  ComplaintStatus,
  ConnectComplaintItem,
} from "./types";

function formatRelativeWhen(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

export function priorityToLabel(
  priority: ComplaintPriority,
): ConnectComplaintItem["priorityLabel"] {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

export function labelToPriority(
  label: "Low" | "Medium" | "High",
): ComplaintPriority {
  if (label === "High") return "high";
  if (label === "Medium") return "medium";
  return "low";
}

export function statusToLabel(status: ComplaintStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "review":
      return "Under Review";
    case "forwarded":
      return "Forwarded";
    case "resolved":
      return "Resolved";
    case "rejected":
      return "Rejected";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
    default:
      return status;
  }
}

export function complaintDtoToConnectItem(dto: ComplaintDto): ConnectComplaintItem {
  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    destination: dto.destination ?? "class_teacher",
    priorityLabel: priorityToLabel(dto.priority),
    statusLabel: statusToLabel(dto.status),
    status: dto.status,
    body: dto.body,
    responseNote: dto.responseNote,
    createdAtLabel: formatRelativeWhen(dto.createdAt),
    studentId: dto.studentId,
  };
}

export function complaintDtosToConnectItems(dtos: ComplaintDto[]): ConnectComplaintItem[] {
  return dtos.map(complaintDtoToConnectItem);
}

function mapTeacherStatus(status: ComplaintStatus): TeacherComplaint["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "pending":
      return "open";
    case "review":
      return "in_progress";
    case "forwarded":
      return "forwarded";
    case "resolved":
      return "resolved";
    case "rejected":
    case "closed":
      return "closed";
    case "archived":
      return "archived";
    default:
      return "open";
  }
}

function mapTeacherPriority(priority: ComplaintPriority): TeacherComplaint["priority"] {
  if (priority === "high") return "urgent";
  return "normal";
}

export function teacherPriorityToApi(
  priority: TeacherComplaint["priority"],
): ComplaintPriority {
  if (priority === "critical" || priority === "urgent") return "high";
  return "medium";
}

export function complaintDtoToTeacherItem(
  dto: ComplaintDto,
  opts?: { studentName?: string | null },
): TeacherComplaint {
  const studentSuffix =
    dto.studentId && opts?.studentName
      ? ` · ${opts.studentName}`
      : dto.studentId
        ? ` · Student`
        : "";

  return {
    id: dto.id,
    title: dto.title,
    category: dto.category,
    priority: mapTeacherPriority(dto.priority),
    status: mapTeacherStatus(dto.status),
    body: dto.body,
    response: dto.responseNote ?? undefined,
    createdAt: formatRelativeWhen(dto.createdAt) + studentSuffix,
    destination: dto.destination ?? undefined,
    studentId: dto.studentId,
    isClassInbox: Boolean(dto.studentId && dto.destination === "class_teacher"),
  };
}

export function complaintDtosToTeacherItems(
  dtos: ComplaintDto[],
  studentNames?: Map<string, string>,
): TeacherComplaint[] {
  return dtos.map((dto) =>
    complaintDtoToTeacherItem(dto, {
      studentName: dto.studentId ? studentNames?.get(dto.studentId) : null,
    }),
  );
}

export function splitTeacherComplaints(items: TeacherComplaint[]): {
  mine: TeacherComplaint[];
  classInbox: TeacherComplaint[];
} {
  const mine: TeacherComplaint[] = [];
  const classInbox: TeacherComplaint[] = [];
  for (const item of items) {
    if (item.isClassInbox) {
      classInbox.push(item);
    } else {
      mine.push(item);
    }
  }
  return { mine, classInbox };
}

export const DEFAULT_DESTINATION: ComplaintDestination = "class_teacher";
