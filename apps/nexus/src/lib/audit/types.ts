/** Mirrors backend AuditEventDto — platform scope only. */

export type PlatformAuditEventDto = {
  id: string;
  scope: "platform";
  instituteId: string | null;
  actorUserId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

/** Unified row for Nexus Audit Log UI (demo + API). */
export type PlatformAuditListItem = {
  id: string;
  at: string;
  operator: string;
  action: string;
  targetId: string;
  targetLabel: string;
  targetKind: PlatformAuditTargetKind;
  before?: string;
  after?: string;
  summary?: string;
  /** When set, target links to institute detail. */
  instituteRouteId?: string;
};

export type PlatformAuditTargetKind =
  | "institute"
  | "license"
  | "module"
  | "policy"
  | "support"
  | "settings"
  | "platform"
  | "registration";

export type ListPlatformAuditParams = {
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
};
