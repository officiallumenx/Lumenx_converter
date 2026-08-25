/**
 * LumenX product feedback — frontend only (localStorage).
 * Goes to LumenX platform, not the school institute.
 */

export const LUMENX_FEEDBACK_STORAGE_KEY = "lumenx.platform.feedback.v1";
export const LUMENX_FEEDBACK_CHANGED_EVENT = "lumenx-platform-feedback-updated";

export type LumenXFeedbackKind = "bug" | "feature" | "experience";

export type LumenXFeedbackSource =
  | "admin"
  | "connect"
  | "transport"
  | "admissions"
  | "careers";

export type LumenXFeedbackEntry = {
  id: string;
  source: LumenXFeedbackSource;
  kind: LumenXFeedbackKind;
  rating: number;
  message: string;
  screenshotFileName: string | null;
  screenshotDataUrl: string | null;
  createdAt: string;
};

export type CreateLumenXFeedbackInput = {
  source: LumenXFeedbackSource;
  kind: LumenXFeedbackKind;
  rating: number;
  message: string;
  screenshotFileName?: string | null;
  screenshotDataUrl?: string | null;
};

function canUseStorage(): boolean {
  return typeof localStorage !== "undefined";
}

function emitChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LUMENX_FEEDBACK_CHANGED_EVENT));
}

export function loadLumenXFeedback(): LumenXFeedbackEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(LUMENX_FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LumenXFeedbackEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLumenXFeedback(entries: LumenXFeedbackEntry[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(LUMENX_FEEDBACK_STORAGE_KEY, JSON.stringify(entries.slice(0, 100)));
    emitChanged();
  } catch {
    // ignore quota
  }
}

export function submitLumenXFeedback(input: CreateLumenXFeedbackInput): LumenXFeedbackEntry {
  const entry: LumenXFeedbackEntry = {
    id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: input.source,
    kind: input.kind,
    rating: input.rating,
    message: input.message.trim(),
    screenshotFileName: input.screenshotFileName ?? null,
    screenshotDataUrl: input.screenshotDataUrl ?? null,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadLumenXFeedback()];
  saveLumenXFeedback(next);
  return entry;
}

export function lumenXFeedbackKindLabel(kind: LumenXFeedbackKind): string {
  switch (kind) {
    case "bug":
      return "Bug";
    case "feature":
      return "Feature Request";
    case "experience":
      return "Experience";
    default:
      return kind;
  }
}

export const LUMENX_FEEDBACK_KINDS: { value: LumenXFeedbackKind; label: string }[] = [
  { value: "bug", label: "Bug" },
  { value: "feature", label: "Feature Request" },
  { value: "experience", label: "Experience" },
];
