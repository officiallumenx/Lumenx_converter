/** Mirrors backend AuditEventDto — keep in sync with domains/audit/types.ts. */

export type AuditScope = "institute" | "platform";

export type AuditEventDto = {
  id: string;
  scope: AuditScope;
  instituteId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ListAuditParams = {
  instituteId: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
};
