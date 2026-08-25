import { useLayoutEffect, type RefObject } from "react";

const FOCUSABLE = "a[href], button:not([disabled])";

/** Traps Tab inside the header + mobile sheet while the menu is open. */
export function useMenuFocusTrap(open: boolean, containerRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    if (!open) return;
    const root = containerRef.current;
    if (!root) return;

    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const getFocusable = () =>
      Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.getAttribute("aria-hidden") !== "true",
      );

    const firstLink = root.querySelector<HTMLElement>("#mobile-nav a[href]");
    (firstLink ?? getFocusable()[0])?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      previous?.focus();
    };
  }, [open, containerRef]);
}
