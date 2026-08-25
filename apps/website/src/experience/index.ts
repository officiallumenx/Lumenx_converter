export { useExperienceTier, usePointerField } from "./usePointerField";
export type { PointerField } from "./usePointerField";
export {
  applyExperienceTier,
  detectExperienceTier,
  experienceAllows,
  type ExperienceTier,
} from "./capability";

import { useExperienceTier } from "./usePointerField";

/** Convenience: whether immersive extras should run. */
export function useImmersionEnabled(): boolean {
  const tier = useExperienceTier();
  return tier !== "reduced" && tier !== "low";
}
