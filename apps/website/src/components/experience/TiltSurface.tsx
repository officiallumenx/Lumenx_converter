import { useCallback, useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { experienceAllows, useExperienceTier } from "@/experience";

/** Subtle 3D tilt on fine-pointer devices. Does not replace nested interactive transforms. */
export function TiltSurface({
  className,
  children,
  maxTilt = 6,
  as: Comp = "div",
}: {
  className?: string;
  children: ReactNode;
  maxTilt?: number;
  as?: "div" | "article" | "section";
}) {
  const tier = useExperienceTier();
  const enabled = experienceAllows(tier, "tilt");
  const ref = useRef<HTMLElement | null>(null);
  const raf = useRef(0);
  const target = useRef({ rx: 0, ry: 0 });

  const setNode = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!fine.matches) return;

    const apply = () => {
      el.style.setProperty("--tilt-rx", `${target.current.rx.toFixed(2)}deg`);
      el.style.setProperty("--tilt-ry", `${target.current.ry.toFixed(2)}deg`);
      raf.current = 0;
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      target.current = {
        rx: (-py * maxTilt * 2),
        ry: (px * maxTilt * 2),
      };
      if (!raf.current) raf.current = requestAnimationFrame(apply);
    };

    const onLeave = () => {
      target.current = { rx: 0, ry: 0 };
      if (!raf.current) raf.current = requestAnimationFrame(apply);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf.current);
      el.style.removeProperty("--tilt-rx");
      el.style.removeProperty("--tilt-ry");
    };
  }, [enabled, maxTilt]);

  const style = {
    "--tilt-rx": "0deg",
    "--tilt-ry": "0deg",
  } as CSSProperties;

  return (
    <Comp
      ref={setNode as never}
      className={cn("site-tilt", enabled && "site-tilt--live", className)}
      style={style}
    >
      {children}
    </Comp>
  );
}
