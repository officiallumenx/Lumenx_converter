import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { experienceAllows, useExperienceTier } from "@/experience";

/** Soft magnetic pull toward the cursor — fine pointer + HIGH tier only. */
export function Magnetic({
  className,
  children,
  strength = 0.22,
}: {
  className?: string;
  children: ReactNode;
  strength?: number;
}) {
  const tier = useExperienceTier();
  const enabled = experienceAllows(tier, "magnetic");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
    };
    const onLeave = () => {
      el.style.transform = "translate3d(0, 0, 0)";
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.style.transform = "";
    };
  }, [enabled, strength]);

  return (
    <div ref={ref} className={cn("site-magnetic", className)}>
      {children}
    </div>
  );
}
