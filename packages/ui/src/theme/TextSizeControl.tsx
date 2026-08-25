import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "../lib/utils";
import {
  DEFAULT_TEXT_SCALE,
  TEXT_SCALE_OPTIONS,
  applyTextScale,
  loadTextScale,
  setTextScale,
  subscribeTextScale,
  type TextScale,
} from "./text-scale";

/** Ensures the shared text scale is applied while this tree is mounted. */
export function TypographyProvider({ children }: { children: ReactNode }) {
  useSyncExternalStore(
    subscribeTextScale,
    () => {
      const scale = loadTextScale();
      applyTextScale(scale);
      return scale;
    },
    () => DEFAULT_TEXT_SCALE,
  );
  return children;
}

export function useTextScale(): {
  scale: TextScale;
  setScale: (next: TextScale) => void;
  options: typeof TEXT_SCALE_OPTIONS;
} {
  const scale = useSyncExternalStore(subscribeTextScale, loadTextScale, () => DEFAULT_TEXT_SCALE);
  return {
    scale,
    setScale: setTextScale,
    options: TEXT_SCALE_OPTIONS,
  };
}

/**
 * Appearance → Text Size control.
 * Options: Small · Default · Large · Extra Large
 */
export function TextSizeControl({
  className,
  size = "default",
}: {
  className?: string;
  size?: "default" | "compact";
}) {
  const { scale, setScale, options } = useTextScale();

  return (
    <div
      role="group"
      aria-label="Text size"
      className={cn(
        "flex w-full max-w-md overflow-hidden rounded-lg border border-border lx-caption",
        size === "compact" && "max-w-sm",
        className,
      )}
    >
      {options.map((opt) => {
        const active = scale === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            aria-pressed={active}
            onClick={() => setScale(opt.id)}
            className={cn(
              "flex-1 px-2 py-1.5 font-medium transition-colors touch-manipulation sm:px-3",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
