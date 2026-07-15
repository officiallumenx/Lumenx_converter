import {
  createInitialTeacherAttendance,
  type TeacherAttendanceRecord,
} from "@/lib/teacher-attendance-data";

export type RegisterStatus = "draft" | "submitted";

export type TeacherDayRegister = {
  date: string;
  status: RegisterStatus;
  updatedAt: string;
  submittedAt?: string;
  submittedBy?: string;
  teachers: TeacherAttendanceRecord[];
};

const registers = new Map<string, TeacherDayRegister>();

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
  const date = isoDate(d);
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
  if (registers.size > 0) return;
  const today = isoDate(new Date());
  registers.set(today, {
    date: today,
    status: "draft",
    updatedAt: new Date().toISOString(),
    teachers: createInitialTeacherAttendance(),
  });
  seedSubmittedDay(1);
  seedSubmittedDay(2, (list) =>
    list.map((t, i) => (i % 7 === 0 ? { ...t, status: "absent" as const, checkIn: null } : t)),
  );
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
  return reg;
}

export function reopenTeacherRegisterAsDraft(date: string) {
  const existing = registers.get(date);
  if (!existing || existing.status !== "submitted") return null;
  const reg: TeacherDayRegister = {
    ...existing,
    status: "draft",
    updatedAt: new Date().toISOString(),
    submittedAt: undefined,
    submittedBy: undefined,
    teachers: cloneTeachers(existing.teachers),
  };
  registers.set(date, { ...reg, teachers: cloneTeachers(reg.teachers) });
  return reg;
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
