import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type UseAnchoredRowMenuOptions = {
  menuWidth: number;
  menuHeight: number;
  gap?: number;
};

/**
 * Anchored portal row-action menu: open state, clamped coords, Escape / outside click,
 * and resize/scroll repositioning. Markup stays in the caller.
 */
export function useAnchoredRowMenu({
  menuWidth,
  menuHeight,
  gap = 4,
}: UseAnchoredRowMenuOptions) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8,
    );
    const openUp = rect.bottom + gap + menuHeight > window.innerHeight && rect.top > menuHeight;
    const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;
    setCoords({ top, left });
  }, [menuWidth, menuHeight, gap]);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updatePosition]);

  const run = useCallback((action: () => void) => {
    action();
    setOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  return {
    open,
    setOpen,
    coords,
    buttonRef,
    menuRef,
    run,
    toggle,
  };
}
