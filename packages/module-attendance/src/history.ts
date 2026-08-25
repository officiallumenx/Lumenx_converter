/**
 * Attendance History — immutable past marks + method resolution per date.
 *
 * Changing Attendance Method / appending config versions never rewrites
 * existing slot registers. Reports always prefer frozen register.method.
 */

import {
  loadAttendanceConfigVersions,
  resolveAttendanceConfigForDate,
} from "./config-store";
import { listAllSlotRegisters, listRegistersForSection } from "./register-store";
import { buildAttendanceSlots } from "./slots";
import type {
  AttendanceConfigVersion,
  AttendanceMethod,
  AttendanceSlotRegister,
  PeriodInput,
} from "./types";

export type HistoricalDayContext = {
  date: string;
  /** Method that governs this date for history/reporting. */
  method: AttendanceMethod;
  /** Config version effective on this date (for unmarked days / audit). */
  config: AttendanceConfigVersion | null;
  /** True when method came from frozen registers, not live config. */
  methodFrozenFromRegisters: boolean;
  registers: AttendanceSlotRegister[];
};

/** Inclusive YYYY-MM-DD range → list of dates. */
export function enumerateIsoDates(from: string, to: string): string[] {
  const start = from.slice(0, 10);
  const end = to.slice(0, 10);
  if (end < start) return [];
  const out: string[] = [];
  const cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    const y = cur.getFullYear();
    const m = String(cur.getMonth() + 1).padStart(2, "0");
    const d = String(cur.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${d}`);
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function isSunday(isoDate: string): boolean {
  return new Date(`${isoDate}T12:00:00`).getDay() === 0;
}

export function isWorkingDay(
  isoDate: string,
  holidayDates: ReadonlySet<string> | readonly string[] = [],
): boolean {
  const holidays =
    holidayDates instanceof Set ? holidayDates : new Set(holidayDates);
  if (holidays.has(isoDate)) return false;
  if (isSunday(isoDate)) return false;
  return true;
}

/**
 * Resolve historical method for a section/date.
 * Prefer frozen method on submitted registers (never rewritten by config change).
 * Fall back to config effective on that date for unmarked working days.
 */
export function resolveHistoricalDay(
  sectionKey: string,
  date: string,
  opts?: { classLabel?: string },
): HistoricalDayContext {
  const registers = listRegistersForSection(sectionKey).filter(
    (r) => r.date === date && r.status === "submitted",
  );
  const config = resolveAttendanceConfigForDate(date, {
    classLabel: opts?.classLabel,
    sectionKey,
  });

  if (registers.length > 0) {
    return {
      date,
      method: registers[0]!.method,
      config,
      methodFrozenFromRegisters: true,
      registers,
    };
  }

  return {
    date,
    method: config?.method ?? "daily",
    config,
    methodFrozenFromRegisters: false,
    registers: [],
  };
}

/** Config versions that apply inside a date window (for audit / UI timelines). */
export function configVersionsTouchingRange(
  from: string,
  to: string,
): AttendanceConfigVersion[] {
  return buildConfigHistoryTimeline()
    .filter((entry) => {
      const start = entry.appliesFrom;
      const endExclusive = entry.nextEffectiveFrom ?? "9999-12-31";
      return start <= to && endExclusive > from;
    })
    .map((e) => e.version);
}

export type AttendanceConfigHistoryEntry = {
  version: AttendanceConfigVersion;
  /** Inclusive start (Effective From). */
  appliesFrom: string;
  /**
   * Inclusive end date, or null when this is the latest version
   * in its scope lane (applies until a superseding scoped/institute row).
   */
  appliesTo: string | null;
  /** Next superseding version's Effective From, if any. */
  nextEffectiveFrom: string | null;
};

function dayBefore(iso: string): string {
  const end = new Date(`${iso}T12:00:00`);
  end.setDate(end.getDate() - 1);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whether `next` ends the applicability of `prev` in the same scope lane. */
function configVersionSupersedes(
  prev: AttendanceConfigVersion,
  next: AttendanceConfigVersion,
): boolean {
  if (next.effectiveFrom < prev.effectiveFrom) return false;
  if (
    next.effectiveFrom === prev.effectiveFrom &&
    next.createdAt <= prev.createdAt
  ) {
    return false;
  }
  if (next.scope !== prev.scope) return false;
  if (next.scope === "institute") return true;
  if (next.scope === "class") {
    const prevClasses = new Set(
      prev.classTargets.map((t) => t.trim()).filter(Boolean),
    );
    return next.classTargets.some((t) => prevClasses.has(t.trim()));
  }
  if (next.scope === "section") {
    const prevSections = new Set(
      prev.sectionTargets.map((t) => t.trim()).filter(Boolean),
    );
    return next.sectionTargets.some((t) => prevSections.has(t.trim()));
  }
  return false;
}

/**
 * Append-only configuration timeline: each row has Effective From and applies
 * until superseded by a later version in the **same scope lane** (institute /
 * overlapping class / overlapping section). Scoped overrides do not end
 * institute ranges and vice versa.
 */
export function buildConfigHistoryTimeline(
  versions: AttendanceConfigVersion[] = loadAttendanceConfigVersions(),
): AttendanceConfigHistoryEntry[] {
  const sorted = [...versions].sort((a, b) => {
    const d = a.effectiveFrom.localeCompare(b.effectiveFrom);
    if (d !== 0) return d;
    return a.createdAt.localeCompare(b.createdAt);
  });

  return sorted.map((version) => {
    const next =
      sorted.find((candidate) => configVersionSupersedes(version, candidate)) ??
      null;
    const nextEffectiveFrom = next?.effectiveFrom ?? null;
    return {
      version,
      appliesFrom: version.effectiveFrom,
      appliesTo: nextEffectiveFrom ? dayBefore(nextEffectiveFrom) : null,
      nextEffectiveFrom,
    };
  });
}

/**
 * True when this version is the resolved config for its targets on `date`
 * (scoped Active badge — not a single global institute id).
 */
export function isConfigVersionActiveOnDate(
  version: AttendanceConfigVersion,
  date: string,
): boolean {
  if (version.effectiveFrom > date) return false;
  if (version.scope === "institute") {
    return resolveAttendanceConfigForDate(date)?.id === version.id;
  }
  if (version.scope === "class") {
    return version.classTargets.some(
      (classLabel) =>
        resolveAttendanceConfigForDate(date, { classLabel })?.id === version.id,
    );
  }
  return version.sectionTargets.some((sectionKey) => {
    const classLabel = sectionKey.split("::")[0];
    return (
      resolveAttendanceConfigForDate(date, {
        sectionKey,
        classLabel,
      })?.id === version.id
    );
  });
}

/**
 * Guarantee: appending config must not alter register storage.
 * Returns true when register count + identities are unchanged after a callback.
 */
export function assertRegistersUntouchedBy(
  mutateConfig: () => void,
): { ok: boolean; before: number; after: number } {
  const beforeList = listAllSlotRegisters();
  const beforeKeys = beforeList
    .map((r) => `${r.id}|${r.method}|${r.configVersionId}|${r.date}|${r.slotId}`)
    .sort();
  mutateConfig();
  const afterList = listAllSlotRegisters();
  const afterKeys = afterList
    .map((r) => `${r.id}|${r.method}|${r.configVersionId}|${r.date}|${r.slotId}`)
    .sort();
  return {
    ok:
      beforeKeys.length === afterKeys.length &&
      beforeKeys.every((k, i) => k === afterKeys[i]),
    before: beforeList.length,
    after: afterList.length,
  };
}

/** Expected slot ids for a historical day (from frozen registers or method). */
export function expectedSlotIdsForDay(
  day: HistoricalDayContext,
  periods: PeriodInput[] = [],
): string[] {
  if (day.registers.length > 0) {
    return [...new Set(day.registers.map((r) => r.slotId))];
  }
  return buildAttendanceSlots(day.method, periods).map((s) => s.id);
}
