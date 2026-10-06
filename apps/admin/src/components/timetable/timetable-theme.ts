export type SubjectTheme = { border: string; bg: string; code: string };

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  MTH: { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "MTH" },
  MATH: { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "MATH" },
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
  TEL: { border: "border-l-fuchsia-500", bg: "bg-fuchsia-500/12 dark:bg-fuchsia-400/15", code: "TEL" },
  HIN: { border: "border-l-red-500", bg: "bg-red-500/12 dark:bg-red-400/15", code: "HIN" },
  SCI: { border: "border-l-teal-500", bg: "bg-teal-500/12 dark:bg-teal-400/15", code: "SCI" },
  SOC: { border: "border-l-sky-500", bg: "bg-sky-500/12 dark:bg-sky-400/15", code: "SOC" },
  GEO: { border: "border-l-yellow-600", bg: "bg-yellow-500/12 dark:bg-yellow-400/15", code: "GEO" },
  ART: { border: "border-l-pink-500", bg: "bg-pink-500/12 dark:bg-pink-400/15", code: "ART" },
};

const NAME_HINTS: Array<{ match: RegExp; key: keyof typeof SUBJECT_THEMES }> = [
  { match: /math|mth|algebra|geometry/i, key: "MTH" },
  { match: /physics|phy\b/i, key: "PHY" },
  { match: /chem|chm\b/i, key: "CHM" },
  { match: /english|eng\b/i, key: "ENG" },
  { match: /computer|coding|cs\b|ict/i, key: "CS" },
  { match: /history|his\b/i, key: "HIS" },
  { match: /biology|bio\b/i, key: "BIO" },
  { match: /physical\s*ed|sports|\bpe\b/i, key: "PE" },
  { match: /lab\b/i, key: "LAB" },
  { match: /telugu|tel\b/i, key: "TEL" },
  { match: /hindi|hin\b/i, key: "HIN" },
  { match: /science|sci\b/i, key: "SCI" },
  { match: /social|civics|sst/i, key: "SOC" },
  { match: /geography|geo\b/i, key: "GEO" },
  { match: /art|drawing|craft/i, key: "ART" },
];

const FALLBACK_THEMES: SubjectTheme[] = [
  { border: "border-l-blue-500", bg: "bg-blue-500/12 dark:bg-blue-400/15", code: "A" },
  { border: "border-l-violet-500", bg: "bg-violet-500/12 dark:bg-violet-400/15", code: "B" },
  { border: "border-l-emerald-500", bg: "bg-emerald-500/12 dark:bg-emerald-400/15", code: "C" },
  { border: "border-l-amber-500", bg: "bg-amber-500/12 dark:bg-amber-400/15", code: "D" },
  { border: "border-l-cyan-500", bg: "bg-cyan-500/12 dark:bg-cyan-400/15", code: "E" },
  { border: "border-l-rose-500", bg: "bg-rose-500/12 dark:bg-rose-400/15", code: "F" },
  { border: "border-l-orange-500", bg: "bg-orange-500/12 dark:bg-orange-400/15", code: "G" },
  { border: "border-l-teal-500", bg: "bg-teal-500/12 dark:bg-teal-400/15", code: "H" },
];

export function subjectTheme(code: string): SubjectTheme {
  const raw = code.trim();
  if (!raw) return FALLBACK_THEMES[0]!;
  const upper = raw.toUpperCase();
  for (const hint of NAME_HINTS) {
    if (hint.match.test(raw)) return SUBJECT_THEMES[hint.key]!;
  }
  if (upper.includes("PE ") || upper.startsWith("PE")) return SUBJECT_THEMES.PE!;
  if (upper.includes("LAB") || upper.includes("CS LAB")) return SUBJECT_THEMES.LAB!;
  const prefix = raw.split(/[\s·-]+/)[0]?.slice(0, 4).toUpperCase() ?? raw;
  for (const [key, theme] of Object.entries(SUBJECT_THEMES)) {
    if (prefix.startsWith(key) || upper.includes(key)) return theme;
  }
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h + raw.charCodeAt(i) * (i + 1)) % FALLBACK_THEMES.length;
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
