/** Automatic experience tiers — invisible to users, drives CSS/JS depth. */

export type ExperienceTier = "high" | "medium" | "low" | "reduced";

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function detectExperienceTier(): ExperienceTier {
  if (typeof window === "undefined") return "medium";

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return "reduced";
  }

  const nav = navigator as NavigatorWithHints;
  const saveData = Boolean(nav.connection?.saveData);
  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.matchMedia("(max-width: 639px)").matches;

  if (saveData || cores <= 2 || memory <= 2) return "low";
  if (coarse || narrow) return "medium";
  return "high";
}

export function applyExperienceTier(tier: ExperienceTier = detectExperienceTier()): ExperienceTier {
  if (typeof document === "undefined") return tier;
  document.documentElement.dataset.experience = tier;
  return tier;
}

export function experienceAllows(
  tier: ExperienceTier,
  feature: "parallax" | "tilt" | "particles" | "flow" | "magnetic",
): boolean {
  if (tier === "reduced") return false;
  if (tier === "low") return feature === "flow";
  if (tier === "medium") return feature === "flow" || feature === "parallax";
  return true;
}
