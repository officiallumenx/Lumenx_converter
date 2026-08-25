import {
  createInitialTeacherAttendance,
  type TeacherAttStatus,
  type TeacherAttendanceRecord,
} from "@/lib/teacher-attendance-data";
import type { AttendanceMarkStatus } from "@lumenx/module-attendance";

export type RegisterStatus = AttendanceMarkStatus;

export type TeacherDayRegister = {
  date: string;
  status: RegisterStatus;
  updatedAt: string;
  submittedAt?: string;
  submittedBy?: string;
  teachers: TeacherAttendanceRecord[];
};

export type TeacherExceptionDay = {
  date: string;
  status: Exclude<TeacherAttStatus, "present">;
  note?: string;
};

export type TeacherOverviewRow = {
  id: string;
  name: string;
  dept: string;
  days: number;
  present: number;
  late: number;
  half: number;
  leave: number;
  absent: number;
  /** (present + late + half) / days */
  attendancePct: number;
  exceptions: TeacherExceptionDay[];
};

const registers = new Map<string, TeacherDayRegister>();
const REGISTERS_KEY = "lumenx.admin.teacher-attendance.v1";
let hydrated = false;

function persistRegisters() {
  try {
    localStorage.setItem(REGISTERS_KEY, JSON.stringify([...registers.entries()]));
  } catch {
    /* ignore */
  }
}

function hydrateRegisters() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(REGISTERS_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, TeacherDayRegister][];
    if (!Array.isArray(entries)) return;
    for (const [date, reg] of entries) {
      if (date && reg) registers.set(date, reg);
    }
  } catch {
    /* seed */
  }
}

function cloneTeachers(teachers: TeacherAttendanceRecord[]) {
  return teachers.map((t) => ({ ...t }));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function seedSubmittedDay(
  offsetDays: number,
  mutate?: (t: TeacherAttendanceRecord[]) => TeacherAttendanceRecord[],
) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  if (d.getDay() === 0) return; // skip Sundays
  const date = isoDate(d);
  if (registers.has(date)) return;
  let teachers = createInitialTeacherAttendance();
  if (mutate) teachers = mutate(teachers);
  const submittedAt = new Date(d);
  submittedAt.setHours(16, 30, 0, 0);
  registers.set(date, {
    date,
    status: "submitted",
    updatedAt: submittedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
    submittedBy: "Admin · Priya Sharma",
    teachers: cloneTeachers(teachers),
  });
}

function seedRegisters() {
  hydrateRegisters();
  if (registers.size > 0) return;
  const today = isoDate(new Date());
  registers.set(today, {
    date: today,
    status: "draft",
    updatedAt: new Date().toISOString(),
    teachers: createInitialTeacherAttendance(),
  });
  for (let offset = 1; offset <= 14; offset++) {
    seedSubmittedDay(offset, (list) =>
      list.map((t, i) => {
        const roll = (i + offset) % 11;
        if (roll === 0) return { ...t, status: "absent" as const, checkIn: null, note: "Unreported" };
        if (roll === 1) return { ...t, status: "leave" as const, checkIn: null, note: "Approved" };
        if (roll === 2) return { ...t, status: "late" as const, checkIn: "09:18" };
        if (roll === 3) return { ...t, status: "half-day" as const, checkIn: "08:40", note: "PM leave" };
        return { ...t, status: "present" as const, checkIn: "08:12", note: undefined };
      }),
    );
  }
}

seedRegisters();

export function getTeacherRegister(date: string): TeacherDayRegister | undefined {
  const r = registers.get(date);
  return r ? { ...r, teachers: cloneTeachers(r.teachers) } : undefined;
}

export function loadOrCreateRegister(date: string): TeacherDayRegister {
  seedRegisters();
  const existing = registers.get(date);
  if (existing) {
    return { ...existing, teachers: cloneTeachers(existing.teachers) };
  }
  const reg: TeacherDayRegister = {
    date,
    status: "draft",
    updatedAt: new Date().toISOString(),
    teachers: createInitialTeacherAttendance(),
  };
  registers.set(date, {
    ...reg,
    teachers: cloneTeachers(reg.teachers),
  });
  persistRegisters();
  return reg;
}

export function saveTeacherRegisterDraft(date: string, teachers: TeacherAttendanceRecord[]) {
  const existing = loadOrCreateRegister(date);
  if (existing.status === "submitted") {
    throw new Error("Cannot edit a submitted register");
  }
  const reg: TeacherDayRegister = {
    ...existing,
    status: "draft",
    updatedAt: new Date().toISOString(),
    teachers: cloneTeachers(teachers),
  };
  registers.set(date, { ...reg, teachers: cloneTeachers(reg.teachers) });
  persistRegisters();
  return reg;
}

export function submitTeacherRegister(
  date: string,
  teachers: TeacherAttendanceRecord[],
  submittedBy = "Admin",
) {
  const reg: TeacherDayRegister = {
    date,
    status: "submitted",
    updatedAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    submittedBy,
    teachers: cloneTeachers(teachers),
  };
  registers.set(date, { ...reg, teachers: cloneTeachers(reg.teachers) });
  persistRegisters();
  return reg;
}

export function reopenTeacherRegisterAsDraft(date: string) {
  const existing = registers.get(date);
  if (!existing || existing.status !== "submitted") return null;
  if (!canEditSubmittedRegister(existing.submittedAt)) return null;
  const reg: TeacherDayRegister = {
    ...existing,
    status: "draft",
    updatedAt: new Date().toISOString(),
    submittedAt: undefined,
    submittedBy: undefined,
    teachers: cloneTeachers(existing.teachers),
  };
  registers.set(date, { ...reg, teachers: cloneTeachers(reg.teachers) });
  persistRegisters();
  return reg;
}

/** Hours after submit during which attendance may still be edited. */
export const TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS = 20;

export function canEditSubmittedRegister(submittedAt?: string, now = Date.now()): boolean {
  if (!submittedAt) return false;
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return false;
  const elapsed = now - submittedMs;
  return elapsed >= 0 && elapsed <= TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS * 60 * 60 * 1000;
}

/** Remaining edit time in ms, or 0 if locked / expired. */
export function editWindowRemainingMs(submittedAt?: string, now = Date.now()): number {
  if (!submittedAt) return 0;
  const submittedMs = new Date(submittedAt).getTime();
  if (Number.isNaN(submittedMs)) return 0;
  const deadline = submittedMs + TEACHER_ATTENDANCE_EDIT_WINDOW_HOURS * 60 * 60 * 1000;
  return Math.max(0, deadline - now);
}

export function listSubmittedTeacherRegisters(): TeacherDayRegister[] {
  seedRegisters();
  return [...registers.values()]
    .filter((r) => r.status === "submitted")
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((r) => ({ ...r, teachers: cloneTeachers(r.teachers) }));
}

export function registerSummary(teachers: TeacherAttendanceRecord[]) {
  const present = teachers.filter((t) => t.status === "present").length;
  const late = teachers.filter((t) => t.status === "late").length;
  const half = teachers.filter((t) => t.status === "half-day").length;
  const absent = teachers.filter((t) => t.status === "absent").length;
  const onLeave = teachers.filter((t) => t.status === "leave").length;
  return { present, late, half, absent, onLeave, total: teachers.length };
}

/** Aggregate submitted days into per-teacher overview rows (presents omitted from exceptions). */
export function buildTeacherAttendanceOverview(): TeacherOverviewRow[] {
  seedRegisters();
  const submitted = [...registers.values()].filter((r) => r.status === "submitted");
  const byId = new Map<string, TeacherOverviewRow>();

  for (const reg of submitted) {
    for (const t of reg.teachers) {
      let row = byId.get(t.id);
      if (!row) {
        row = {
          id: t.id,
          name: t.name,
          dept: t.dept,
          days: 0,
          present: 0,
          late: 0,
          half: 0,
          leave: 0,
          absent: 0,
          attendancePct: 0,
          exceptions: [],
        };
        byId.set(t.id, row);
      }
      row.days += 1;
      if (t.status === "present") row.present += 1;
      else if (t.status === "late") {
        row.late += 1;
        row.exceptions.push({ date: reg.date, status: "late", note: t.note });
      } else if (t.status === "half-day") {
        row.half += 1;
        row.exceptions.push({ date: reg.date, status: "half-day", note: t.note });
      } else if (t.status === "leave") {
        row.leave += 1;
        row.exceptions.push({ date: reg.date, status: "leave", note: t.note });
      } else {
        row.absent += 1;
        row.exceptions.push({ date: reg.date, status: "absent", note: t.note });
      }
    }
  }

  return [...byId.values()]
    .map((row) => {
      const attended = row.present + row.late + row.half;
      return {
        ...row,
        attendancePct: row.days === 0 ? 0 : Math.round((attended / row.days) * 100),
        exceptions: [...row.exceptions].sort((a, b) => b.date.localeCompare(a.date)),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
