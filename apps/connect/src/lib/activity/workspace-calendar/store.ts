import type {
  CreatePracticeCalendarInput,
  CreateReminderInput,
  UpdateReminderInput,
  WorkspaceCalendarEntry,
  WorkspaceCalendarFilters,
} from "./types";
import { WORKSPACE_CALENDAR_CATEGORY_COLORS } from "./types";

function nowIso() {
  return new Date().toISOString();
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Seed — mid July 2026 around the demo school week. */
function buildSeed(): WorkspaceCalendarEntry[] {
  const ts = "2026-07-01T08:00:00.000Z";
  return [
    {
      id: "cal-sport-1",
      title: "Cricket Team 1 — nets & fielding",
      date: "2026-07-16",
      startTime: "07:00",
      kind: "linked",
      category: "sports",
      description: "Outdoor cricket activity for Team 1.",
      venue: "Cricket ground",
      unitId: "team-cricket-1",
      unitLabel: "Cricket · Team 1",
      sourceModule: "sports",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.sports,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-sport-2",
      title: "Badminton — indoor courts",
      date: "2026-07-18",
      startTime: "15:30",
      kind: "linked",
      category: "sports",
      description: "Indoor sports session.",
      venue: "Indoor hall",
      unitId: "team-badminton-1",
      unitLabel: "Badminton · Team 1",
      sourceModule: "sports",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.sports,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-eca-1",
      title: "Dance Group 1 — stage rehearsal",
      date: "2026-07-16",
      startTime: "14:00",
      kind: "linked",
      category: "extra-curricular",
      description: "ECA dance group rehearsal.",
      venue: "Auditorium",
      unitId: "group-dance-1",
      unitLabel: "Dance · Group 1",
      sourceModule: "extra-curricular",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS["extra-curricular"],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-eca-2",
      title: "Music Group — choir practice",
      date: "2026-07-17",
      startTime: "13:00",
      kind: "linked",
      category: "extra-curricular",
      venue: "Music room",
      sourceModule: "extra-curricular",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS["extra-curricular"],
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-practice-1",
      title: "Practice · Kabaddi Team 1",
      date: "2026-07-16",
      startTime: "16:00",
      kind: "linked",
      category: "practice",
      description: "Evening practice session.",
      unitId: "team-kabaddi-1",
      unitLabel: "Kabaddi · Team 1",
      sourceModule: "practice",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.practice,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-prog-1",
      title: "School sports day briefing",
      date: "2026-07-20",
      startTime: "09:00",
      kind: "linked",
      category: "programme",
      description: "School programme for captains and coordinators.",
      venue: "Main hall",
      sourceModule: "programme",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.programme,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-prog-2",
      title: "Independence Day cultural programme",
      date: "2026-08-14",
      startTime: "10:00",
      kind: "linked",
      category: "programme",
      venue: "Auditorium",
      sourceModule: "programme",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.programme,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-rem-1",
      title: "Arrange medals & trophies",
      date: "2026-07-19",
      kind: "reminder",
      category: "reminder",
      description: "Collect from store room before sports day.",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.reminder,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: "cal-rem-2",
      title: "Book buses for dance team",
      date: "2026-07-17",
      startTime: "10:00",
      kind: "reminder",
      category: "reminder",
      description: "Confirm vendor and share route with parents.",
      colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.reminder,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

let entries: WorkspaceCalendarEntry[] = buildSeed();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function subscribeCalendarStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCalendarSnapshot(): WorkspaceCalendarEntry[] {
  return entries;
}

export function resetCalendarStore() {
  entries = buildSeed();
  emit();
}

export function listCalendarEntriesFromStore(
  filters?: WorkspaceCalendarFilters,
): WorkspaceCalendarEntry[] {
  let list = entries.map((e) => ({ ...e }));
  if (filters?.category && filters.category !== "all") {
    list = list.filter((e) => e.category === filters.category);
  }
  if (filters?.date) {
    list = list.filter((e) => e.date === filters.date);
  }
  if (filters?.query?.trim()) {
    const q = filters.query.trim().toLowerCase();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.description?.toLowerCase().includes(q) ?? false) ||
        (e.unitLabel?.toLowerCase().includes(q) ?? false) ||
        (e.venue?.toLowerCase().includes(q) ?? false),
    );
  }
  return list.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime ?? "").localeCompare(b.startTime ?? "");
  });
}

export function getCalendarEntryFromStore(id: string) {
  return entries.find((e) => e.id === id) ?? null;
}

export function createReminderInStore(input: CreateReminderInput): WorkspaceCalendarEntry {
  const ts = nowIso();
  const entry: WorkspaceCalendarEntry = {
    id: uid("rem"),
    title: input.title.trim(),
    date: input.date,
    startTime: input.startTime?.trim() || undefined,
    description: input.description?.trim() || undefined,
    kind: "reminder",
    category: "reminder",
    colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.reminder,
    createdAt: ts,
    updatedAt: ts,
  };
  entries = [entry, ...entries];
  emit();
  return { ...entry };
}

export function updateReminderInStore(
  id: string,
  patch: UpdateReminderInput,
): WorkspaceCalendarEntry | null {
  const idx = entries.findIndex((e) => e.id === id && e.kind === "reminder");
  if (idx < 0) return null;
  const prev = entries[idx];
  const next: WorkspaceCalendarEntry = {
    ...prev,
    title: patch.title?.trim() ?? prev.title,
    date: patch.date ?? prev.date,
    startTime:
      patch.startTime !== undefined
        ? patch.startTime.trim() || undefined
        : prev.startTime,
    description:
      patch.description !== undefined
        ? patch.description.trim() || undefined
        : prev.description,
    updatedAt: nowIso(),
  };
  entries = [...entries.slice(0, idx), next, ...entries.slice(idx + 1)];
  emit();
  return { ...next };
}

export function deleteReminderInStore(id: string): boolean {
  const before = entries.length;
  entries = entries.filter((e) => !(e.id === id && e.kind === "reminder"));
  if (entries.length === before) return false;
  emit();
  return true;
}

/** Persist a practice session onto the calendar (from Practice module). */
export function addPracticeToCalendarStore(
  input: CreatePracticeCalendarInput,
): WorkspaceCalendarEntry {
  const ts = nowIso();
  const entry: WorkspaceCalendarEntry = {
    id: uid("practice"),
    title: input.title.trim(),
    date: input.date,
    startTime: input.startTime,
    kind: "linked",
    category: "practice",
    unitId: input.unitIds[0],
    unitLabel: input.unitLabels.join(", "),
    sourceModule: "practice",
    colorClass: WORKSPACE_CALENDAR_CATEGORY_COLORS.practice,
    createdAt: ts,
    updatedAt: ts,
  };
  entries = [entry, ...entries];
  emit();
  return { ...entry };
}
