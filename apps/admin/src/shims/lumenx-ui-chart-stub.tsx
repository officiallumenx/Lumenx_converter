import type * as React from "react";

/**
 * Dev-only stub for `packages/ui/src/components/ui/chart.tsx`.
 * Admin Vite serve aliases the real chart module here so Home / shell imports of
 * `@lumenx/ui` do not pull Recharts into the development module graph.
 *
 * Admin Analytics and attendance import `recharts` directly and are unaffected.
 */

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<"light" | "dark", string> }
  );
};

function stubUnavailable(exportName: string): never {
  throw new Error(
    `[admin] @lumenx/ui Chart export "${exportName}" is stubbed in Vite serve. ` +
      "Admin does not ship the shared UI Chart components; import recharts directly " +
      "(as Analytics and attendance do) if you need charts.",
  );
}

export function ChartContainer(
  _props: React.ComponentProps<"div"> & {
    config: ChartConfig;
    children?: React.ReactNode;
  },
): never {
  return stubUnavailable("ChartContainer");
}

export function ChartTooltip(_props: Record<string, unknown>): never {
  return stubUnavailable("ChartTooltip");
}

export function ChartTooltipContent(_props: Record<string, unknown>): never {
  return stubUnavailable("ChartTooltipContent");
}

export function ChartLegend(_props: Record<string, unknown>): never {
  return stubUnavailable("ChartLegend");
}

export function ChartLegendContent(_props: Record<string, unknown>): never {
  return stubUnavailable("ChartLegendContent");
}

export function ChartStyle(_props: { id: string; config: ChartConfig }): never {
  return stubUnavailable("ChartStyle");
}
