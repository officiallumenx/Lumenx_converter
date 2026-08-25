/**
 * Nexus module accent colors — platform UI only (not Admin route colors).
 * Group accents keep Plans & Modules / adoption charts colorful and scannable.
 */

import {
  NEXUS_MODULE_CATALOG,
  type NexusModuleGroup,
} from "@/lib/institute-licensing-store";

export type NexusModuleAccent = {
  /** Icon / text */
  fg: string;
  /** Soft well background */
  bg: string;
  /** Border / ring */
  border: string;
  /** Solid bar / progress */
  solid: string;
};

export const NEXUS_MODULE_GROUP_COLORS: Record<NexusModuleGroup, NexusModuleAccent> = {
  Core: {
    fg: "oklch(0.48 0.14 230)",
    bg: "oklch(0.94 0.03 230)",
    border: "oklch(0.72 0.08 230 / 0.45)",
    solid: "oklch(0.58 0.14 230)",
  },
  Operations: {
    fg: "oklch(0.45 0.12 185)",
    bg: "oklch(0.94 0.03 185)",
    border: "oklch(0.70 0.08 185 / 0.45)",
    solid: "oklch(0.55 0.12 185)",
  },
  Communications: {
    fg: "oklch(0.48 0.16 295)",
    bg: "oklch(0.95 0.03 295)",
    border: "oklch(0.72 0.10 295 / 0.45)",
    solid: "oklch(0.58 0.16 295)",
  },
  Intelligence: {
    fg: "oklch(0.46 0.14 255)",
    bg: "oklch(0.94 0.03 255)",
    border: "oklch(0.70 0.09 255 / 0.45)",
    solid: "oklch(0.55 0.14 255)",
  },
  Infrastructure: {
    fg: "oklch(0.42 0.04 250)",
    bg: "oklch(0.93 0.015 250)",
    border: "oklch(0.68 0.03 250 / 0.45)",
    solid: "oklch(0.50 0.04 250)",
  },
  Services: {
    fg: "oklch(0.45 0.13 155)",
    bg: "oklch(0.94 0.03 155)",
    border: "oklch(0.70 0.08 155 / 0.45)",
    solid: "oklch(0.55 0.13 155)",
  },
  Institute: {
    fg: "oklch(0.50 0.14 35)",
    bg: "oklch(0.95 0.03 35)",
    border: "oklch(0.74 0.08 35 / 0.45)",
    solid: "oklch(0.60 0.14 35)",
  },
};

const MUTED: NexusModuleAccent = {
  fg: "oklch(0.48 0.02 240)",
  bg: "oklch(0.94 0.01 240)",
  border: "oklch(0.70 0.02 240 / 0.40)",
  solid: "oklch(0.55 0.02 240)",
};

export function colorForModuleGroup(group: NexusModuleGroup): NexusModuleAccent {
  return NEXUS_MODULE_GROUP_COLORS[group] ?? MUTED;
}

export function colorForModule(moduleId: string): NexusModuleAccent {
  const def = NEXUS_MODULE_CATALOG.find((m) => m.id === moduleId);
  if (!def) return MUTED;
  return colorForModuleGroup(def.group);
}

/** Inline style bag for icon wells / chips */
export function moduleAccentStyle(
  accent: NexusModuleAccent,
  enabled = true,
): { color: string; background: string; borderColor: string } {
  if (!enabled) {
    return {
      color: "var(--muted-foreground)",
      background: "var(--accent)",
      borderColor: "var(--border)",
    };
  }
  return {
    color: accent.fg,
    background: accent.bg,
    borderColor: accent.border,
  };
}
