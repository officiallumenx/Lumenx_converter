import { Children, isValidElement, type CSSProperties, type ReactNode } from "react";
import { cn } from "@lumenx/ui";

export type GridColumns = 2 | 3 | 4;

const COL: Record<GridColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function Grid({
  columns = 2,
  className,
  children,
  stagger = false,
}: {
  columns?: GridColumns;
  className?: string;
  children: ReactNode;
  stagger?: boolean;
}) {
  return (
    <div className={cn("grid gap-4", COL[columns], className)}>
      {stagger
        ? Children.map(children, (child, i) => {
            if (child == null) return null;
            const key = isValidElement(child) && child.key != null ? child.key : i;
            return (
              <div
                key={key}
                className="site-stagger__item min-w-0"
                style={{ "--i": Math.min(i, 5) } as CSSProperties}
              >
                {child}
              </div>
            );
          })
        : children}
    </div>
  );
}
