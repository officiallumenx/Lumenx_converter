/**
 * LumenX Transport — motion / transition tokens.
 */

export const durations = {
  instant: "0ms",
  fast: "120ms",
  normal: "180ms",
  slow: "280ms",
  slower: "400ms",
} as const;

export const easings = {
  standard: "cubic-bezier(0.25, 1, 0.4, 1)",
  emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
  spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  linear: "linear",
} as const;

export const transitions = {
  colors: `color ${durations.fast} ${easings.standard}, background-color ${durations.fast} ${easings.standard}, border-color ${durations.fast} ${easings.standard}`,
  transform: `transform ${durations.normal} ${easings.emphasized}`,
  shadow: `box-shadow ${durations.normal} ${easings.standard}`,
  opacity: `opacity ${durations.fast} ${easings.standard}`,
  interactive: `color ${durations.fast} ${easings.standard}, background-color ${durations.fast} ${easings.standard}, border-color ${durations.fast} ${easings.standard}, box-shadow ${durations.normal} ${easings.standard}, transform ${durations.normal} ${easings.emphasized}`,
} as const;

export type DurationToken = keyof typeof durations;
export type EasingToken = keyof typeof easings;
export type TransitionToken = keyof typeof transitions;
