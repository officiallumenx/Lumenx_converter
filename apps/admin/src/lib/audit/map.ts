import {
  AUDIT_MODULES,
  type AuditEntry,
  type AuditModule,
  type AuditStatus,
} from "@/lib/audit-activity-data";
import type { AuditEventDto } from "./types";

function metaString(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const value = metadata[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function mapModule(raw: string | null, entityType: string): AuditModule {
  const candidate = (raw ?? entityType).trim();
  const exact = AUDIT_MODULES.find(
    (m) => m.toLowerCase() === candidate.toLowerCase(),
  );
  if (exact) return exact;

  const normalized = candidate.toLowerCase().replace(/[_-]+/g, " ");
  const fuzzy = AUDIT_MODULES.find((m) => m.toLowerCase() === normalized);
  if (fuzzy) return fuzzy;

  // Common entity_type → module heuristics (presentation only).
  if (normalized.includes("student")) return "Students";
  if (normalized.includes("teacher")) return "Teachers";
  if (normalized.includes("attendance")) return "Attendance";
  if (normalized.includes("mark") || normalized.includes("exam")) return "Marks";
  if (normalized.includes("fee") || normalized.includes("payment")) return "Fees";
  if (normalized.includes("leave")) return "Leave";
  if (normalized.includes("complaint")) return "Complaints";
  if (normalized.includes("notification")) return "Notifications";
  if (normalized.includes("document") || normalized.includes("certificate")) {
    return "Documents";
  }
  if (normalized.includes("admission")) return "Admissions";
  if (normalized.includes("setting")) return "Settings";
  if (normalized.includes("storage") || normalized.includes("asset")) {
    return "Storage";
  }
  return "Platform";
}

function mapStatus(raw: unknown): AuditStatus {
  if (raw === "success" || raw === "warning" || raw === "info" || raw === "error") {
    return raw;
  }
  return "info";
}

/**
 * Map backend audit DTO → existing AuditActivityPanel row model.
 * Presentation-only: never used as authorization or tenant authority.
 */
export function auditEventDtoToListItem(dto: AuditEventDto): AuditEntry {
  const metadata =
    dto.metadata && typeof dto.metadata === "object" ? dto.metadata : {};

  const user =
    metaString(metadata, "actorName") ||
    metaString(metadata, "user") ||
    (dto.actorUserId
      ? `User ${dto.actorUserId.slice(0, 8)}`
      : "System");

  const role =
    metaString(metadata, "actorRole") ||
    metaString(metadata, "role") ||
    "Admin";

  const target =
    metaString(metadata, "target") ||
    `${dto.entityType} · ${dto.entityId}`;

  const module = mapModule(metaString(metadata, "module"), dto.entityType);
  const status = mapStatus(metadata.status);

  return {
    id: dto.id,
    user,
    role,
    action: dto.action,
    target,
    module,
    status,
    at: formatAt(dto.createdAt),
    atSort: dto.createdAt,
    actorScope: "admin",
  };
}

export function auditEventDtosToListItems(dtos: AuditEventDto[]): AuditEntry[] {
  return dtos.map(auditEventDtoToListItem);
}
