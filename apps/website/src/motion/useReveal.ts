import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";

/** Observe once; adds `.is-in` for CSS reveals. Content stays visible without `.site-motion`. */
export function useReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.classList.contains("is-in")) return;
    if (!document.documentElement.classList.contains("site-motion")) {
      el.classList.add("is-in", "is-instant");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        el.classList.add("is-in");
        io.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return ref;
}

export function staggerVars(index: number): { className: string; style: CSSProperties } {
  return {
    className: "site-stagger__item",
    style: { "--i": Math.min(index, 5) } as CSSProperties,
  };
}
