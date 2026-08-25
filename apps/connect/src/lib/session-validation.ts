import type { Role, User } from "@lumenx/types";

const ROLES: readonly Role[] = ["parent", "teacher", "student"];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function isThemeMode(value: unknown): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

/** Minimal shape check for persisted Connect users. */
export function parsePersistedUser(raw: string | null): User | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const u = parsed as Record<string, unknown>;
    if (typeof u.id !== "string" || typeof u.name !== "string") return null;
    if (!Array.isArray(u.roles) || !u.roles.every((r) => isRole(r))) return null;
    return parsed as User;
  } catch {
    return null;
  }
}
