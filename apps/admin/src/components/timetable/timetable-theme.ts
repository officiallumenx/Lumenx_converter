export type SubjectTheme = { border: string; bg: string; code: string };

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  MTH: { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "MTH" },
  PHY: { border: "border-l-violet-500", bg: "bg-violet-500/12 dark:bg-violet-400/15", code: "PHY" },
  CHM: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/12 dark:bg-emerald-400/15",
    code: "CHM",
  },
  CHE: {
    border: "border-l-emerald-500",
    bg: "bg-emerald-500/12 dark:bg-emerald-400/15",
    code: "CHE",
  },
  ENG: { border: "border-l-amber-500", bg: "bg-amber-500/12 dark:bg-amber-400/15", code: "ENG" },
  CS: { border: "border-l-cyan-500", bg: "bg-cyan-500/12 dark:bg-cyan-400/15", code: "CS" },
  HIS: { border: "border-l-orange-500", bg: "bg-orange-500/12 dark:bg-orange-400/15", code: "HIS" },
  BIO: { border: "border-l-rose-500", bg: "bg-rose-500/12 dark:bg-rose-400/15", code: "BIO" },
  PE: { border: "border-l-lime-500", bg: "bg-lime-500/12 dark:bg-lime-400/15", code: "PE" },
  LAB: { border: "border-l-indigo-500", bg: "bg-indigo-500/12 dark:bg-indigo-400/15", code: "LAB" },
};

const FALLBACK_THEMES: SubjectTheme[] = [
  { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "A" },
  { border: "border-l-violet-500", bg: "bg-violet-500/12 dark:bg-violet-400/15", code: "B" },
  { border: "border-l-emerald-500", bg: "bg-emerald-500/12 dark:bg-emerald-400/15", code: "C" },
  { border: "border-l-amber-500", bg: "bg-amber-500/12 dark:bg-amber-400/15", code: "D" },
  { border: "border-l-cyan-500", bg: "bg-cyan-500/12 dark:bg-cyan-400/15", code: "E" },
];

export function subjectTheme(code: string): SubjectTheme {
  const upper = code.toUpperCase();
  if (upper.includes("PE ") || upper.startsWith("PE")) return SUBJECT_THEMES.PE!;
  if (upper.includes("LAB") || upper.includes("CS LAB")) return SUBJECT_THEMES.LAB!;
  const prefix = code.split(" ")[0]?.slice(0, 3).toUpperCase() ?? code;
  for (const [key, theme] of Object.entries(SUBJECT_THEMES)) {
    if (prefix.startsWith(key) || upper.includes(key)) return theme;
  }
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h + code.charCodeAt(i)) % FALLBACK_THEMES.length;
  return FALLBACK_THEMES[h]!;
}

export const TIMETABLE_DRAG_MIME = "application/x-lumenx-timetable";

export type TimetableDragPayload =
  | { kind: "cell"; day: number; period: number }
  | { kind: "subject"; subjectId: string; code: string; name: string };

export function readTimetableDrag(data: DataTransfer): TimetableDragPayload | null {
  const raw = data.getData(TIMETABLE_DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TimetableDragPayload;
  } catch {
    return null;
  }
}

export function writeTimetableDrag(data: DataTransfer, payload: TimetableDragPayload) {
  data.setData(TIMETABLE_DRAG_MIME, JSON.stringify(payload));
  data.effectAllowed = "move";
}
