import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export type ComparisonRow = {
  id: string;
  cells: ReactNode[];
};

export function ProductComparison({
  caption,
  columns,
  rows,
  className,
}: {
  caption?: string;
  columns: readonly string[];
  rows: readonly ComparisonRow[];
  className?: string;
}) {
  const label = caption ?? "Comparison table";
  return (
    <div>
      <p className="site-table-hint">Swipe sideways to see every column.</p>
      <div
        className={cn("site-table-wrap", className)}
        role="region"
        tabIndex={0}
        aria-label={`${label}. Table scrolls horizontally on small screens.`}
      >
        <table className="site-table">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {row.cells.map((cell, i) => (
                  <td key={i} className={i === 0 ? "font-medium" : "text-muted-foreground"}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
