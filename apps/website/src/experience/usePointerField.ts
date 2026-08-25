import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyExperienceTier,
  detectExperienceTier,
  type ExperienceTier,
} from "./capability";

/** Syncs `data-experience` and returns the live tier. */
export function useExperienceTier(): ExperienceTier {
  const [tier, setTier] = useState<ExperienceTier>(() =>
    typeof document !== "undefined" ? detectExperienceTier() : "medium",
  );

  useEffect(() => {
    const sync = () => setTier(applyExperienceTier());
    sync();

    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mqNarrow = window.matchMedia("(max-width: 639px)");
    const mqCoarse = window.matchMedia("(pointer: coarse)");

    mqReduce.addEventListener("change", sync);
    mqNarrow.addEventListener("change", sync);
    mqCoarse.addEventListener("change", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      mqReduce.removeEventListener("change", sync);
      mqNarrow.removeEventListener("change", sync);
      mqCoarse.removeEventListener("change", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return tier;
}

export type PointerField = { x: number; y: number };

/**
 * Smooth pointer field in [-1, 1] as CSS vars `--eco-px` / `--eco-py`.
 * No React re-renders on the hot path.
 */
export function usePointerField(
  enabled: boolean,
  strength = 1,
): {
  ref: (node: HTMLElement | null) => void;
} {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const target = useRef<PointerField>({ x: 0, y: 0 });
  const current = useRef<PointerField>({ x: 0, y: 0 });
  const rafRef = useRef(0);

  const ref = useCallback((el: HTMLElement | null) => {
    setNode(el);
  }, []);

  useEffect(() => {
    if (!enabled || !node) {
      target.current = { x: 0, y: 0 };
      current.current = { x: 0, y: 0 };
      if (node) {
        node.style.removeProperty("--eco-px");
        node.style.removeProperty("--eco-py");
      }
      return;
    }

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      target.current = {
        x: Math.max(-1, Math.min(1, nx)) * strength,
        y: Math.max(-1, Math.min(1, ny)) * strength,
      };
    };

    const onLeave = () => {
      target.current = { x: 0, y: 0 };
    };

    const tick = () => {
      const cx = current.current.x + (target.current.x - current.current.x) * 0.08;
      const cy = current.current.y + (target.current.y - current.current.y) * 0.08;
      current.current = { x: cx, y: cy };
      node.style.setProperty("--eco-px", cx.toFixed(4));
      node.style.setProperty("--eco-py", cy.toFixed(4));
      rafRef.current = requestAnimationFrame(tick);
    };

    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerleave", onLeave);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      node.removeEventListener("pointermove", onMove);
      node.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(rafRef.current);
      node.style.removeProperty("--eco-px");
      node.style.removeProperty("--eco-py");
    };
  }, [enabled, strength, node]);

  return { ref };
}
