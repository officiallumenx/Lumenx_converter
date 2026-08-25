import { useCallback, useRef, type PointerEvent } from "react";

const LONG_PRESS_MS = 520;

/**
 * Tap vs long-press without conflicting with scrolling.
 * Tap → onTap; hold → onLongPress (skips the following tap).
 */
export function useTapLongPress(onTap: () => void, onLongPress: () => void) {
  const timerRef = useRef<number | null>(null);
  const longPressedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.button !== 0) return;
      longPressedRef.current = false;
      pointerIdRef.current = event.pointerId;
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        longPressedRef.current = true;
        timerRef.current = null;
        onLongPress();
      }, LONG_PRESS_MS);
    },
    [clearTimer, onLongPress],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
      const wasLong = longPressedRef.current;
      clearTimer();
      pointerIdRef.current = null;
      if (!wasLong) onTap();
      longPressedRef.current = false;
    },
    [clearTimer, onTap],
  );

  const onPointerCancel = useCallback(() => {
    clearTimer();
    pointerIdRef.current = null;
    // If long-press already fired, leave the flag so a late pointer up skips tap.
  }, [clearTimer]);

  const onPointerLeave = useCallback(
    (event: PointerEvent) => {
      if (pointerIdRef.current != null && event.pointerId !== pointerIdRef.current) return;
      // Cancel an in-progress hold when the pointer drifts off (e.g. scroll),
      // but keep a completed long-press flag until pointer up so tap is skipped.
      if (!longPressedRef.current) {
        clearTimer();
        pointerIdRef.current = null;
      }
    },
    [clearTimer],
  );

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onPointerLeave,
  };
}
