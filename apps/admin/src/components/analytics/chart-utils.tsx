import type { ReactNode } from "react";

export const CHART_HEIGHT = 220;
export const CHART_HEIGHT_SM = 180;

type TooltipPayload = { name?: string; value?: number; color?: string; fill?: string };

export function AdminChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  formatter?: (name: string, value: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-pop text-xs">
      {label != null && label !== "" && <p className="font-semibold text-foreground mb-1.5">{label}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => {
          const name = String(entry.name ?? "");
          const value = Number(entry.value ?? 0);
          const color = entry.color ?? entry.fill ?? "var(--chart-1)";
          return (
            <li key={name} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: color }} />
                {name}
              </span>
              <span className="font-mono font-medium text-foreground">
                {formatter ? formatter(name, value) : value}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ChartLegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-4 mt-3 text-[10px] text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  hint,
  action,
  children,
  className = "",
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-surface border border-border rounded-xl shadow-elevated overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
        {action}
      </div>
      <div className="px-3 pb-4 sm:px-5">{children}</div>
    </div>
  );
}

export const axisTick = { fontSize: 10, fill: "oklch(0.55 0.02 260)" };
export const gridStroke = "oklch(1 0 0 / 0.06)";
