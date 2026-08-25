/**
 * Shared Text Size scale for all LumenX apps.
 * Default is "default". Does not follow device font scale.
 */

export const TEXT_SCALE_STORAGE_KEY = "lumenx.text-scale.v1";

export type TextScale = "small" | "default" | "large" | "xl";

export const TEXT_SCALE_OPTIONS: ReadonlyArray<{
  id: TextScale;
  label: string;
}> = [
  { id: "small", label: "Small" },
  { id: "default", label: "Default" },
  { id: "large", label: "Large" },
  { id: "xl", label: "Extra Large" },
] as const;

export const DEFAULT_TEXT_SCALE: TextScale = "default";

const ROOT_PX: Record<TextScale, string> = {
  small: "14px",
  default: "16px",
  large: "18px",
  xl: "20px",
};

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

export function isTextScale(value: unknown): value is TextScale {
  return value === "small" || value === "default" || value === "large" || value === "xl";
}

export function loadTextScale(): TextScale {
  if (typeof localStorage === "undefined") return DEFAULT_TEXT_SCALE;
  try {
    const raw = localStorage.getItem(TEXT_SCALE_STORAGE_KEY);
    if (isTextScale(raw)) return raw;
    // Migrate legacy Connect key if present
    const legacy = localStorage.getItem("ues_text_size");
    if (legacy === "sm" || legacy === "xs") return "small";
    if (legacy === "md" || legacy === "default") return "default";
    if (legacy === "lg") return "large";
    if (legacy === "xl" || legacy === "xxl") return "xl";
  } catch {
    /* ignore */
  }
  return DEFAULT_TEXT_SCALE;
}

/** Apply scale to <html> — fixed px root, ignores device font scale. */
export function applyTextScale(scale: TextScale = loadTextScale()): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.textSize = scale;
  root.style.setProperty("--lx-root-font-size", ROOT_PX[scale]);
  // Clear legacy Connect overrides
  root.style.removeProperty("--connect-root-font-size");
  root.style.removeProperty("--connect-module-label-size");
}

export function setTextScale(scale: TextScale): TextScale {
  try {
    localStorage.setItem(TEXT_SCALE_STORAGE_KEY, scale);
    localStorage.removeItem("ues_text_size");
  } catch {
    /* ignore */
  }
  applyTextScale(scale);
  notify();
  return scale;
}

export function subscribeTextScale(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getTextScaleRootPx(scale: TextScale = loadTextScale()): string {
  return ROOT_PX[scale];
}

/** Eager apply on module load to avoid a flash of wrong size. */
if (typeof document !== "undefined") {
  applyTextScale(loadTextScale());
}
