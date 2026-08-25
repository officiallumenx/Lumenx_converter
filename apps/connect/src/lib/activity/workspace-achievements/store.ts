/**
 * Activity Coordinator achievements (V1) — Team/Group or individual from unit roster.
 */

import type { ActivityDomain } from "@/lib/activity/hierarchy";

export type AchievementScope = "unit" | "student";

export type RecordedAchievement = {
  id: string;
  scope: AchievementScope;
  title: string;
  domain: ActivityDomain;
  unitId: string;
  unitLabel: string;
  unitKind: "team" | "group";
  studentId?: string;
  studentName?: string;
  recordedAt: string;
};

export type RecordUnitAchievementInput = {
  title: string;
  domain: ActivityDomain;
  unitId: string;
  unitLabel: string;
  unitKind: "team" | "group";
};

export type RecordStudentAchievementsInput = {
  title: string;
  domain: ActivityDomain;
  unitId: string;
  unitLabel: string;
  unitKind: "team" | "group";
  students: { id: string; name: string }[];
};

let records: RecordedAchievement[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function nowIso() {
  return new Date().toISOString();
}

export function subscribeAchievementsStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAchievementsSnapshot(): RecordedAchievement[] {
  return records;
}

export function resetAchievementsStore() {
  records = [];
  emit();
}

export function recordUnitAchievementInStore(
  input: RecordUnitAchievementInput,
): RecordedAchievement {
  const entry: RecordedAchievement = {
    id: `ach-u-${Date.now()}`,
    scope: "unit",
    title: input.title.trim(),
    domain: input.domain,
    unitId: input.unitId,
    unitLabel: input.unitLabel,
    unitKind: input.unitKind,
    recordedAt: nowIso(),
  };
  records = [entry, ...records];
  emit();
  return { ...entry };
}

export function recordStudentAchievementsInStore(
  input: RecordStudentAchievementsInput,
): RecordedAchievement[] {
  const title = input.title.trim();
  const ts = nowIso();
  const created: RecordedAchievement[] = input.students.map((s, i) => ({
    id: `ach-s-${Date.now()}-${i}`,
    scope: "student" as const,
    title,
    domain: input.domain,
    unitId: input.unitId,
    unitLabel: input.unitLabel,
    unitKind: input.unitKind,
    studentId: s.id,
    studentName: s.name,
    recordedAt: ts,
  }));
  records = [...created, ...records];
  emit();
  return created.map((c) => ({ ...c }));
}
