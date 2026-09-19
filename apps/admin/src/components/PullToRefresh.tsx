import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Loader2 } from "lucide-react";
import { requestDataRefresh } from "@/lib/data-refresh";
import { useDataRefreshSnapshot } from "@/hooks/useReloadKey";

const PULL_THRESHOLD_PX = 72;
const MAX_PULL_PX = 110;

type PullToRefreshProps = {
  scrollRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  /** When false, gestures are ignored (e.g. desktop-only). Default: true on coarse pointers. */
  enabled?: boolean;
};

/**
 * Pull-down on the main scroller refreshes page data only (no route remount).
 */
export function PullToRefresh({
  scrollRef,
  children,
  enabled,
}: PullToRefreshProps) {
  const snapshot = useDataRefreshSnapshot();
  const [pullPx, setPullPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);
  const armed = useRef(false);

  const isEnabled =
    enabled ??
    (typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        // Capacitor WebView often reports fine pointer; still allow pull-to-refresh.
        Boolean(document.documentElement.dataset.lxNative)));

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!isEnabled) return;
      const el = scrollRef.current;
      if (!el || el.scrollTop > 2) {
        armed.current = false;
        return;
      }
      startY.current = event.touches[0]?.clientY ?? 0;
      pulling.current = false;
      armed.current = true;
    },
    [isEnabled, scrollRef],
  );

  const onTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!isEnabled || !armed.current) return;
      const el = scrollRef.current;
      if (!el || el.scrollTop > 2) {
        if (pulling.current) {
          pulling.current = false;
          setDragging(false);
          setPullPx(0);
        }
        return;
      }
      const y = event.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;
      if (delta <= 8) return;
      pulling.current = true;
      setDragging(true);
      const damped = Math.min(MAX_PULL_PX, delta * 0.45);
      setPullPx(damped);
      if (delta > 12) {
        event.preventDefault();
      }
    },
    [isEnabled, scrollRef],
  );

  const onTouchEnd = useCallback(() => {
    if (!isEnabled) return;
    const shouldRefresh = pulling.current && pullPx >= PULL_THRESHOLD_PX;
    pulling.current = false;
    armed.current = false;
    setDragging(false);
    setPullPx(0);
    if (shouldRefresh) {
      void requestDataRefresh("manual");
    }
  }, [isEnabled, pullPx]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isEnabled) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [scrollRef, isEnabled, onTouchStart, onTouchMove, onTouchEnd]);

  const showStatus =
    snapshot.phase === "refreshing" || (dragging && pullPx > 12);
  const ready = pullPx >= PULL_THRESHOLD_PX;

  return (
    <>
      <div
        className="pointer-events-none sticky top-0 z-20 flex justify-center overflow-hidden transition-[height] duration-150"
        style={{ height: showStatus ? Math.max(pullPx, snapshot.phase === "refreshing" ? 36 : 0) : 0 }}
        aria-live="polite"
        aria-busy={snapshot.phase === "refreshing"}
      >
        <div
          className={`mt-1 inline-flex items-center gap-1.5 rounded-full border border-border bg-card/95 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm ${
            snapshot.phase === "refreshing" || ready
              ? "text-foreground"
              : ""
          }`}
        >
          <Loader2
            className={`size-3.5 ${
              snapshot.phase === "refreshing" || ready ? "animate-spin" : ""
            }`}
          />
          {snapshot.phase === "refreshing"
            ? "Updating…"
            : ready
              ? "Release to update"
              : "Pull to update"}
        </div>
      </div>
      {children}
    </>
  );
}

/** Compact status strip for header area (auto + manual refresh). */
export function DataRefreshStatusBar() {
  const snapshot = useDataRefreshSnapshot();
  if (snapshot.phase !== "refreshing") return null;
  return (
    <div
      className="flex items-center justify-center gap-1.5 border-b border-border bg-muted/40 px-3 py-1 text-[11px] text-muted-foreground"
      aria-live="polite"
    >
      <Loader2 className="size-3 animate-spin" />
      Updating data…
    </div>
  );
}
