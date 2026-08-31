import type { AuditRecord } from "@/lib/audit-log-store";
import type {
  PlatformAuditEventDto,
  PlatformAuditListItem,
  PlatformAuditTargetKind,
} from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PLATFORM_AUDIT_ACTION_LABEL: Record<string, string> = {
  institute_created: "Institute created",
  institute_suspended: "Institute suspended",
  institute_archived: "Institute archived",
  plan_changed: "Plan changed",
  billing_changed: "Billing changed",
  module_enabled: "Module enabled",
  module_disabled: "Module disabled",
  policy_changed: "Policy changed",
  support_status_changed: "Support status changed",
  platform_setting_changed: "Platform setting changed",
  registration_approved: "Registration approved",
  registration_rejected: "Registration rejected",
};

function metaString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapEntityTypeToTargetKind(entityType: string): PlatformAuditTargetKind {
  const normalized = entityType.trim().toLowerCase();
  if (normalized === "institute") return "institute";
  if (normalized === "registration") return "registration";
  if (normalized === "license" || normalized === "subscription") return "license";
  if (normalized === "module") return "module";
  if (normalized === "policy" || normalized === "alert_rule") return "policy";
  if (normalized === "support" || normalized === "support_thread") return "support";
  if (normalized === "settings" || normalized === "platform_setting") return "settings";
  return "platform";
}

function resolveInstituteRouteId(
  dto: PlatformAuditEventDto,
  targetKind: PlatformAuditTargetKind,
): string | undefined {
  const fromDto = dto.instituteId?.trim();
  if (fromDto && UUID_RE.test(fromDto)) return fromDto;

  const fromMeta = metaString(dto.metadata, "instituteId");
  if (fromMeta && UUID_RE.test(fromMeta)) return fromMeta;

  if (targetKind === "institute" && UUID_RE.test(dto.entityId)) {
    return dto.entityId;
  }

  return undefined;
}

export function labelPlatformAuditAction(action: string): string {
  return (
    PLATFORM_AUDIT_ACTION_LABEL[action] ??
    action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function auditEventDtoToListItem(dto: PlatformAuditEventDto): PlatformAuditListItem {
  const metadata =
    dto.metadata && typeof dto.metadata === "object" ? dto.metadata : {};

  const targetKind = mapEntityTypeToTargetKind(dto.entityType);
  const operator =
    metaString(metadata, "operator") ??
    metaString(metadata, "operatorHandle") ??
    (dto.actorUserId ? dto.actorUserId.slice(0, 8) : "system");

  const targetLabel =
    metaString(metadata, "targetLabel") ??
    metaString(metadata, "target") ??
    dto.entityId;

  return {
    id: dto.id,
    at: dto.createdAt,
    operator,
    action: dto.action,
    targetId: dto.entityId,
    targetLabel,
    targetKind,
    before: metaString(metadata, "before") ?? undefined,
    after: metaString(metadata, "after") ?? undefined,
    summary: metaString(metadata, "summary") ?? undefined,
    instituteRouteId: resolveInstituteRouteId(dto, targetKind),
  };
}

export function auditEventDtosToListItems(
  dtos: PlatformAuditEventDto[],
): PlatformAuditListItem[] {
  return dtos.map(auditEventDtoToListItem);
}

export function demoAuditRecordToListItem(record: AuditRecord): PlatformAuditListItem {
  const instituteRouteId =
    record.targetKind === "institute" && record.targetId.startsWith("ins-")
      ? record.targetId
      : undefined;

  return {
    id: record.id,
    at: record.at,
    operator: record.operator,
    action: record.action,
    targetId: record.targetId,
    targetLabel: record.targetLabel,
    targetKind: record.targetKind,
    before: record.before,
    after: record.after,
    summary: record.summary,
    instituteRouteId,
  };
}

export function demoAuditRecordsToListItems(
  records: AuditRecord[],
): PlatformAuditListItem[] {
  return records.map(demoAuditRecordToListItem);
}
