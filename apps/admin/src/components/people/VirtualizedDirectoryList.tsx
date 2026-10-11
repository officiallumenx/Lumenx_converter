/**
 * Lightweight windowed list for Admin people directories.
 * Avoids mounting thousands of DOM nodes without adding a virtualizer dependency.
 */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

type Props<T> = {
  items: T[];
  /** Estimated row height in px (padding included). */
  estimateRowHeight?: number;
  overscan?: number;
  className?: string;
  /** Optional max height; defaults to viewport-friendly scroll region. */
  maxHeightClassName?: string;
  getKey: (item: T, index: number) => string;
  renderRow: (item: T, index: number) => ReactNode;
  /** Shown below the window when more server pages exist. */
  footer?: ReactNode;
};

export function VirtualizedDirectoryList<T>({
  items,
  estimateRowHeight = 72,
  overscan = 8,
  className = "",
  maxHeightClassName = "max-h-[min(70vh,720px)]",
  getKey,
  renderRow,
  footer,
}: Props<T>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(480);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setViewport(el.clientHeight || 480);
    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const total = items.length;
  const start = Math.max(0, Math.floor(scrollTop / estimateRowHeight) - overscan);
  const visibleCount = Math.ceil(viewport / estimateRowHeight) + overscan * 2;
  const end = Math.min(total, start + visibleCount);
  const padTop = start * estimateRowHeight;
  const padBottom = Math.max(0, (total - end) * estimateRowHeight);
  const slice = items.slice(start, end);

  const scrollerStyle: CSSProperties = {
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
  };

  return (
    <div
      ref={scrollerRef}
      className={`${maxHeightClassName} overflow-y-auto ${className}`.trim()}
      style={scrollerStyle}
      onScroll={onScroll}
      role="list"
    >
      <div style={{ height: padTop }} aria-hidden />
      {slice.map((item, i) => {
        const index = start + i;
        return (
          <div
            key={getKey(item, index)}
            role="listitem"
            style={{ contentVisibility: "auto", containIntrinsicSize: `auto ${estimateRowHeight}px` }}
          >
            {renderRow(item, index)}
          </div>
        );
      })}
      <div style={{ height: padBottom }} aria-hidden />
      {footer}
    </div>
  );
}
