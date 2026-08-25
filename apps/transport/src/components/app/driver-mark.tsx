import { cn } from "@lumenx/ui";

/** Rounded driver portal mark — letter D in the app header. */
export function DriverMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl bg-transport font-display text-base font-bold text-transport-foreground shadow-soft",
        className,
      )}
      aria-hidden
    >
      D
    </div>
  );
}
