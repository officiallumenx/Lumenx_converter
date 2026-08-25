import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export type DeviceKind = "phone" | "tablet";

export function DeviceMockup({
  device = "phone",
  title,
  children,
  className,
  compact = false,
  demo = false,
}: {
  device?: DeviceKind;
  title?: string;
  children: ReactNode;
  className?: string;
  compact?: boolean;
  demo?: boolean;
}) {
  const phone = device === "phone";
  return (
    <div
      className={cn(
        "mx-auto",
        compact
          ? phone
            ? "max-w-[200px]"
            : "max-w-[280px]"
          : demo
            ? "max-w-[240px]"
            : phone
              ? "max-w-[280px]"
              : "max-w-[520px]",
        className,
      )}
    >
      <figure className="site-device m-0">
        {title ? (
          <figcaption className="mb-2 px-2 text-center text-[10px] font-medium uppercase tracking-[0.16em] text-[oklch(0.78_0.08_210)]">
            {title}
          </figcaption>
        ) : null}
        <div
          className={cn(
            "overflow-hidden rounded-[0.9rem] bg-[oklch(0.995_0.004_250)] text-left text-foreground",
            compact
              ? phone
                ? "min-h-[220px]"
                : "min-h-[180px]"
              : demo
                ? "min-h-[300px]"
                : phone
                  ? "min-h-[420px]"
                  : "min-h-[340px]",
          )}
        >
          {children}
        </div>
      </figure>
    </div>
  );
}
