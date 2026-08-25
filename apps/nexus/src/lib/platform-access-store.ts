/**
 * Nexus Platform Access — demo IAM for Nexus operators only.
 * Roles are platform-level (Root, Operations, Billing, Support, Analyst).
 * Institute roles (Principal, Front Office, etc.) belong in Admin — not here.
 * Frontend/demo permissions only. No real backend auth.
 */

export type NexusAccessArea =
  | "institutes"
  | "billing"
  | "modules"
  | "support"
  | "analytics"
  | "policies"
  | "audit"
  | "settings";

export type NexusPermLevel = "full" | "read" | "none";

export type NexusRoleId =
  | "nexus_root"
  | "operations"
  | "billing"
  | "support"
  | "analyst";

export type NexusRoleDef = {
  id: NexusRoleId;
  name: string;
  description: string;
  system: boolean;
  perms: Record<NexusAccessArea, NexusPermLevel>;
};

export type NexusOperator = {
  id: string;
  handle: string;
  displayName: string;
  roleId: NexusRoleId;
  status: "active" | "invited" | "disabled";
  lastActiveAt: string;
};

const STORAGE_ROLES = "lumenx.nexus.platformAccess.roles.v1";
const STORAGE_OPS = "lumenx.nexus.platformAccess.operators.v1";
const STORAGE_SESSION = "lumenx.nexus.platformAccess.activeOperator.v1";
const CHANGE_EVENT = "lumenx-nexus-platform-access-changed";
const DEFAULT_ACTIVE_OPERATOR_ID = "op-root";

export const NEXUS_ACCESS_AREAS: { id: NexusAccessArea; label: string; hint: string }[] = [
  { id: "institutes", label: "Institutes", hint: "Directory & lifecycle" },
  { id: "billing", label: "Billing", hint: "Licenses & renewals" },
  { id: "modules", label: "Modules", hint: "Plans & entitlements" },
  { id: "support", label: "Support", hint: "Support Center threads" },
  { id: "analytics", label: "Analytics", hint: "Network analytics" },
  { id: "policies", label: "Policies", hint: "Platform alerts & rules" },
  { id: "audit", label: "Audit", hint: "Platform audit log" },
  { id: "settings", label: "Settings", hint: "Platform settings" },
];

function allFull(): Record<NexusAccessArea, NexusPermLevel> {
  return Object.fromEntries(NEXUS_ACCESS_AREAS.map((a) => [a.id, "full"])) as Record<
    NexusAccessArea,
    NexusPermLevel
  >;
}

function mk(
  preset: Partial<Record<NexusAccessArea, NexusPermLevel>>,
  fallback: NexusPermLevel = "none",
): Record<NexusAccessArea, NexusPermLevel> {
  return Object.fromEntries(
    NEXUS_ACCESS_AREAS.map((a) => [a.id, preset[a.id] ?? fallback]),
  ) as Record<NexusAccessArea, NexusPermLevel>;
}

export const DEFAULT_NEXUS_ROLES: NexusRoleDef[] = [
  {
    id: "nexus_root",
    name: "Nexus Root",
    description: "Full platform control across all Nexus areas.",
    system: true,
    perms: allFull(),
  },
  {
    id: "operations",
    name: "Operations",
    description: "Day-to-day institute lifecycle, modules, and support escalation.",
    system: true,
    perms: mk({
      institutes: "full",
      billing: "read",
      modules: "full",
      support: "full",
      analytics: "read",
      policies: "read",
      audit: "read",
      settings: "none",
    }),
  },
  {
    id: "billing",
    name: "Billing",
    description: "Commercial plans, invoices, renewals, and payment follow-up.",
    system: true,
    perms: mk({
      institutes: "read",
      billing: "full",
      modules: "read",
      support: "read",
      analytics: "read",
      policies: "read",
      audit: "read",
      settings: "none",
    }),
  },
  {
    id: "support",
    name: "Support",
    description: "Support Center ownership with limited commercial visibility.",
    system: true,
    perms: mk({
      institutes: "read",
      billing: "none",
      modules: "read",
      support: "full",
      analytics: "none",
      policies: "read",
      audit: "read",
      settings: "none",
    }),
  },
  {
    id: "analyst",
    name: "Analyst",
    description: "Read-only network analytics and aggregate platform metrics.",
    system: true,
    perms: mk({
      institutes: "read",
      billing: "read",
      modules: "read",
      support: "none",
      analytics: "full",
      policies: "read",
      audit: "read",
      settings: "none",
    }),
  },
];

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const DEFAULT_NEXUS_OPERATORS: NexusOperator[] = [
  {
    id: "op-root",
    handle: "nexus_root",
    displayName: "Platform Owner",
    roleId: "nexus_root",
    status: "active",
    lastActiveAt: daysAgo(0),
  },
  {
    id: "op-priya",
    handle: "ops.priya",
    displayName: "Priya · Operations",
    roleId: "operations",
    status: "active",
    lastActiveAt: daysAgo(0),
  },
  {
    id: "op-arjun",
    handle: "ops.arjun",
    displayName: "Arjun · Operations",
    roleId: "operations",
    status: "active",
    lastActiveAt: daysAgo(1),
  },
  {
    id: "op-billing",
    handle: "billing.neha",
    displayName: "Neha · Billing",
    roleId: "billing",
    status: "active",
    lastActiveAt: daysAgo(2),
  },
  {
    id: "op-maya",
    handle: "support.maya",
    displayName: "Maya · Support",
    roleId: "support",
    status: "active",
    lastActiveAt: daysAgo(0),
  },
  {
    id: "op-analyst",
    handle: "analyst.dev",
    displayName: "Dev · Analyst",
    roleId: "analyst",
    status: "invited",
    lastActiveAt: daysAgo(9),
  },
];

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function readJson<T>(key: string, fallback: () => T): T {
  if (typeof localStorage === "undefined") return fallback();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = fallback();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notify();
}

export function subscribePlatformAccess(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_ROLES || e.key === STORAGE_OPS) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function listNexusRoles(): NexusRoleDef[] {
  const stored = readJson<NexusRoleDef[]>(STORAGE_ROLES, () => DEFAULT_NEXUS_ROLES);
  const byId = new Map(stored.map((r) => [r.id, r]));
  // Keep canonical system roles; merge saved perms when present
  return DEFAULT_NEXUS_ROLES.map((def) => {
    const saved = byId.get(def.id);
    if (!saved) return def;
    return {
      ...def,
      perms: { ...def.perms, ...saved.perms },
      description: saved.description || def.description,
    };
  });
}

export function listNexusOperators(): NexusOperator[] {
  return readJson<NexusOperator[]>(STORAGE_OPS, () => DEFAULT_NEXUS_OPERATORS).sort((a, b) =>
    a.handle.localeCompare(b.handle),
  );
}

export function getNexusRole(id: NexusRoleId): NexusRoleDef | null {
  return listNexusRoles().find((r) => r.id === id) ?? null;
}

export function setRolePerm(
  roleId: NexusRoleId,
  area: NexusAccessArea,
  level: NexusPermLevel,
): NexusRoleDef | null {
  if (roleId === "nexus_root") return getNexusRole(roleId); // Root stays full
  const roles = listNexusRoles();
  const idx = roles.findIndex((r) => r.id === roleId);
  if (idx < 0) return null;
  const next: NexusRoleDef = {
    ...roles[idx]!,
    perms: { ...roles[idx]!.perms, [area]: level },
  };
  roles[idx] = next;
  writeJson(STORAGE_ROLES, roles);
  return next;
}

export function assignOperatorRole(operatorId: string, roleId: NexusRoleId): NexusOperator | null {
  const ops = listNexusOperators();
  const idx = ops.findIndex((o) => o.id === operatorId);
  if (idx < 0) return null;
  const next = { ...ops[idx]!, roleId };
  ops[idx] = next;
  writeJson(STORAGE_OPS, ops);
  return next;
}

export function setOperatorStatus(
  operatorId: string,
  status: NexusOperator["status"],
): NexusOperator | null {
  const ops = listNexusOperators();
  const idx = ops.findIndex((o) => o.id === operatorId);
  if (idx < 0) return null;
  const next = { ...ops[idx]!, status };
  ops[idx] = next;
  writeJson(STORAGE_OPS, ops);
  return next;
}

export function inviteNexusOperator(input: {
  handle: string;
  displayName: string;
  roleId: NexusRoleId;
}): NexusOperator | null {
  const handle = input.handle.trim().toLowerCase().replace(/\s+/g, ".");
  const displayName = input.displayName.trim();
  if (!handle || !displayName) return null;
  const ops = listNexusOperators();
  if (ops.some((o) => o.handle === handle)) return null;
  const op: NexusOperator = {
    id: `op-${Date.now().toString(36)}`,
    handle,
    displayName,
    roleId: input.roleId,
    status: "invited",
    lastActiveAt: new Date().toISOString(),
  };
  writeJson(STORAGE_OPS, [op, ...ops]);
  return op;
}

export function platformAccessStats(roles: NexusRoleDef[], ops: NexusOperator[]) {
  return {
    roles: roles.length,
    operators: ops.length,
    active: ops.filter((o) => o.status === "active").length,
    invited: ops.filter((o) => o.status === "invited").length,
    areas: NEXUS_ACCESS_AREAS.length,
  };
}

export function labelPerm(level: NexusPermLevel): string {
  if (level === "full") return "Full";
  if (level === "read") return "Read";
  return "None";
}

export function permTone(level: NexusPermLevel): "success" | "warning" | "neutral" {
  if (level === "full") return "success";
  if (level === "read") return "warning";
  return "neutral";
}

export function labelOperatorStatus(s: NexusOperator["status"]): string {
  if (s === "active") return "Active";
  if (s === "invited") return "Invited";
  return "Disabled";
}

export function operatorStatusTone(
  s: NexusOperator["status"],
): "success" | "warning" | "danger" | "neutral" {
  if (s === "active") return "success";
  if (s === "invited") return "warning";
  return "neutral";
}

export function formatAccessDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function cyclePerm(level: NexusPermLevel): NexusPermLevel {
  if (level === "none") return "read";
  if (level === "read") return "full";
  return "none";
}

/** Demo session — which Nexus operator's permissions apply (e.g. global search). */
export function getActiveNexusOperatorId(): string {
  if (typeof localStorage === "undefined") return DEFAULT_ACTIVE_OPERATOR_ID;
  try {
    const raw = localStorage.getItem(STORAGE_SESSION);
    if (raw && listNexusOperators().some((o) => o.id === raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_ACTIVE_OPERATOR_ID;
}

export function setActiveNexusOperatorId(operatorId: string): void {
  if (typeof localStorage === "undefined") return;
  if (!listNexusOperators().some((o) => o.id === operatorId)) return;
  localStorage.setItem(STORAGE_SESSION, operatorId);
  notify();
}

export function getActiveNexusOperator(): NexusOperator | null {
  const id = getActiveNexusOperatorId();
  return listNexusOperators().find((o) => o.id === id) ?? null;
}

export function getActiveOperatorPerms(): Record<NexusAccessArea, NexusPermLevel> {
  const op = getActiveNexusOperator();
  const role = getNexusRole(op?.roleId ?? "nexus_root");
  return role?.perms ?? allFull();
}

/** Search / UI gate — read or full counts as access. */
export function canAccessArea(area: NexusAccessArea): boolean {
  return getActiveOperatorPerms()[area] !== "none";
}
