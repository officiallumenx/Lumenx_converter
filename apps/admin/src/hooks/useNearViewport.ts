import { useEffect, useRef, useState, type RefObject } from "react";
import {
  NEAR_VIEWPORT_ROOT_MARGIN,
  createOnceIntersectObserver,
} from "./near-viewport";

/**
 * Becomes true once the element is intersecting (or near) the viewport.
 * Starts false so optional work (e.g. signed photo URLs) does not run for
 * off-screen list cards. Falls back to true when IntersectionObserver is missing.
 */
export function useNearViewport<T extends Element = HTMLDivElement>(opts?: {
  rootMargin?: string;
}): {
  ref: RefObject<T | null>;
  visible: boolean;
} {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const rootMargin = opts?.rootMargin ?? NEAR_VIEWPORT_ROOT_MARGIN;

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      setVisible(true);
      return;
    }
    const observer = createOnceIntersectObserver(() => setVisible(true), rootMargin);
    if (!observer) {
      setVisible(true);
      return;
    }
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, visible };
}
