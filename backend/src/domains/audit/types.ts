/** Audit domain types aligned to public.audit_event (append-only). */

export type AuditScope = "institute" | "platform";

export type AuditEventRow = {
  id: string;
  scope: AuditScope;
  institute_id: string | null;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

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

export type ListAuditFilter = {
  scope: AuditScope;
  instituteId?: string;
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  limit?: number;
};

export type AppendAuditInput = {
  scope: AuditScope;
  instituteId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};
