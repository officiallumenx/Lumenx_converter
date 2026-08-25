import type { AttendanceSlotRegister } from "./types";
import {
  canonicalAttendanceClassId,
  normalizeAttendanceSectionKey,
} from "./identity";

/** v2 — canonical section keys (`10::B`) + student ids (`stu:10:B:14`). */
export const ATTENDANCE_REGISTER_STORAGE_KEY = "lumenx.attendance-registers.v2";

type RegisterSnapshot = {
  registers: AttendanceSlotRegister[];
};

/** In-memory fallback when localStorage is unavailable (Node / tests). */
let memoryRegisters: AttendanceSlotRegister[] = [];

function canonicalizeRegister(
  register: AttendanceSlotRegister,
): AttendanceSlotRegister {
  return {
    ...register,
    sectionKey: normalizeAttendanceSectionKey(register.sectionKey),
    classLabel: canonicalAttendanceClassId(register.classLabel),
    section: (register.section ?? "").trim().toUpperCase(),
  };
}

function readAll(): AttendanceSlotRegister[] {
  if (typeof localStorage === "undefined") {
    return memoryRegisters.map(canonicalizeRegister);
  }
  try {
    const raw = localStorage.getItem(ATTENDANCE_REGISTER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RegisterSnapshot;
    const rows = Array.isArray(parsed.registers) ? parsed.registers : [];
    return rows.map(canonicalizeRegister);
  } catch {
    return [];
  }
}

function writeAll(registers: AttendanceSlotRegister[]): void {
  const normalized = registers.map(canonicalizeRegister);
  memoryRegisters = [...normalized];
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      ATTENDANCE_REGISTER_STORAGE_KEY,
      JSON.stringify({ registers: normalized }),
    );
  } catch {
    /* ignore */
  }
}

export function registerKey(
  sectionKey: string,
  date: string,
  slotId: string,
): string {
  return `${normalizeAttendanceSectionKey(sectionKey)}::${date}::${slotId}`;
}

export function loadSlotRegister(
  sectionKey: string,
  date: string,
  slotId: string,
): AttendanceSlotRegister | null {
  const key = registerKey(sectionKey, date, slotId);
  return (
    readAll().find(
      (r) => registerKey(r.sectionKey, r.date, r.slotId) === key,
    ) ?? null
  );
}

export function listRegistersForSection(
  sectionKey: string,
): AttendanceSlotRegister[] {
  const want = normalizeAttendanceSectionKey(sectionKey);
  return readAll()
    .filter((r) => normalizeAttendanceSectionKey(r.sectionKey) === want)
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return a.slotId.localeCompare(b.slotId);
    });
}

export function listAllSlotRegisters(): AttendanceSlotRegister[] {
  return [...readAll()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Upsert a register. Never rewrites a different date/slot's history.
 * Same section+date+slot may be updated (draft → submit / edit), but
 * method / owner / configVersionId stay frozen from the first save.
 */
export function upsertSlotRegister(
  register: AttendanceSlotRegister,
): AttendanceSlotRegister {
  const incoming = canonicalizeRegister(register);
  const all = readAll();
  const key = registerKey(incoming.sectionKey, incoming.date, incoming.slotId);
  const existing = all.find(
    (r) => registerKey(r.sectionKey, r.date, r.slotId) === key,
  );
  const frozen: AttendanceSlotRegister = existing
    ? {
        ...incoming,
        id: existing.id,
        // Historical policy fields never change after first write
        method: existing.method,
        owner: existing.owner,
        configVersionId: existing.configVersionId,
        slotKind: existing.slotKind,
        slotLabel: existing.slotLabel,
      }
    : incoming;

  const next = all.filter(
    (r) => registerKey(r.sectionKey, r.date, r.slotId) !== key,
  );
  next.push(frozen);
  writeAll(next);
  return frozen;
}

/** Test helper */
export function clearAttendanceRegistersForTests(): void {
  writeAll([]);
}
