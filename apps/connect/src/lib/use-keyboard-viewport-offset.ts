import { useEffect, useState } from "react";

const KEYBOARD_OPEN_THRESHOLD = 80;

export type KeyboardViewportState = {
  /** Pixels covered by the on-screen keyboard. */
  offset: number;
  /** Visible viewport height while the keyboard animates. */
  height: number;
  offsetTop: number;
  open: boolean;
};

function readKeyboardViewport(): KeyboardViewportState {
  if (typeof window === "undefined") {
    return { offset: 0, height: 0, offsetTop: 0, open: false };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return {
      offset: 0,
      height: window.innerHeight,
      offsetTop: 0,
      open: false,
    };
  }
  const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  return {
    offset: Math.round(offset),
    height: Math.round(vv.height),
    offsetTop: Math.round(vv.offsetTop),
    open: offset > KEYBOARD_OPEN_THRESHOLD,
  };
}

/** Height covered by the on-screen keyboard (iOS / Android mobile browsers). */
export function useKeyboardViewportOffset(): number {
  return useKeyboardViewport().offset;
}

/** Keyboard-aware viewport metrics for login and other full-screen forms. */
export function useKeyboardViewport(): KeyboardViewportState {
  const [state, setState] = useState(readKeyboardViewport);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = readKeyboardViewport();
        setState((prev) =>
          prev.offset === next.offset &&
          prev.height === next.height &&
          prev.offsetTop === next.offsetTop &&
          prev.open === next.open
            ? prev
            : next,
        );
      });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);

    return () => {
      cancelAnimationFrame(raf);
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return state;
}

const LOGIN_SCROLL_SELECTOR = ".login-keyboard-scroll";

/**
 * Scroll only enough to keep the focused field above the keyboard.
 * Avoids full-page scrollIntoView that pushes the form around.
 */
export function scrollFieldIntoView(el: HTMLElement | null) {
  if (!el) return;

  requestAnimationFrame(() => {
    const { open } = readKeyboardViewport();
    if (!open) return;

    const scrollParent = el.closest(LOGIN_SCROLL_SELECTOR) as HTMLElement | null;
    if (!scrollParent) return;

    const vv = window.visualViewport;
    const visibleBottom = vv ? vv.offsetTop + vv.height - 16 : window.innerHeight - 16;
    const elRect = el.getBoundingClientRect();

    if (elRect.bottom > visibleBottom) {
      scrollParent.scrollTop += elRect.bottom - visibleBottom;
      return;
    }

    const header = scrollParent.querySelector(".login-keyboard-header");
    const headerBottom =
      header?.getBoundingClientRect().bottom ?? scrollParent.getBoundingClientRect().top;
    if (elRect.top < headerBottom + 4) {
      scrollParent.scrollTop -= headerBottom + 4 - elRect.top;
    }
  });
}
