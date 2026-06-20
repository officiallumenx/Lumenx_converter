import type { BaseEntity } from "./entities";

export function nowIso(): string {
  return new Date().toISOString();
}

export function createEntityId(prefix: string): string {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${suffix}`;
}

export function withTimestamps<T extends object>(
  partial: T,
  existing?: Pick<BaseEntity, "id" | "createdAt" | "updatedAt">,
): T & BaseEntity {
  const ts = nowIso();
  return {
    ...partial,
    id: existing?.id ?? createEntityId("ENT"),
    createdAt: existing?.createdAt ?? ts,
    updatedAt: ts,
  };
}
