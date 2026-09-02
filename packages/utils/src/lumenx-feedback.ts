/**
 * LumenX product feedback — frontend form + optional API transport.
 * Demo: localStorage. API mode: apps register a transport that POSTs /api/v1/product-feedback.
 */

export const LUMENX_FEEDBACK_STORAGE_KEY = "lumenx.platform.feedback.v1";
export const LUMENX_FEEDBACK_CHANGED_EVENT = "lumenx-platform-feedback-updated";

export type LumenXFeedbackKind = "bug" | "feature" | "experience";

export type LumenXFeedbackSource =
  | "admin"
  | "connect"
  | "transport"
  | "admissions"
  | "careers"
  | "nexus";

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

export type LumenXFeedbackTransport = {
  /** Resolve institute UUID for the current session; null → cannot use API. */
  resolveInstituteId: () => string | null | Promise<string | null>;
  /** POST to backend. Throw on failure. */
  submit: (
    input: CreateLumenXFeedbackInput & { instituteId: string },
  ) => Promise<void>;
};

let feedbackTransport: LumenXFeedbackTransport | null = null;

/** Apps call this once in API auth mode (e.g. from a root provider). */
export function setLumenXFeedbackTransport(
  transport: LumenXFeedbackTransport | null,
): void {
  feedbackTransport = transport;
}

export function getLumenXFeedbackTransport(): LumenXFeedbackTransport | null {
  return feedbackTransport;
}

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

/** Demo / offline path — always writes localStorage. */
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

export type SubmitLumenXFeedbackResult = {
  mode: "api" | "demo";
  entry?: LumenXFeedbackEntry;
};

/**
 * Prefer API transport when configured + institute id available.
 * Falls back to localStorage demo otherwise.
 */
export async function submitLumenXFeedbackAsync(
  input: CreateLumenXFeedbackInput,
): Promise<SubmitLumenXFeedbackResult> {
  const transport = feedbackTransport;
  if (transport) {
    const instituteId = await transport.resolveInstituteId();
    if (instituteId) {
      await transport.submit({ ...input, instituteId });
      return { mode: "api" };
    }
  }
  return { mode: "demo", entry: submitLumenXFeedback(input) };
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
