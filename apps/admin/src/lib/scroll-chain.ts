/** When an inner scroll area hits its end, continue scrolling the outer container. */

export function isScrollableY(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

export function findNestedScrollableY(
  start: EventTarget | null,
  boundary: HTMLElement,
): HTMLElement | null {
  let el: Element | null = start instanceof Element ? start : null;
  while (el && el !== boundary) {
    if (el instanceof HTMLElement && isScrollableY(el)) return el;
    el = el.parentElement;
  }
  return null;
}

/**
 * Wheel handler: if the event is over a nested scroller that cannot move further,
 * apply the delta to `outer` instead so the outer scrollbar activates.
 */
export function chainWheelToOuter(outer: HTMLElement, e: WheelEvent): void {
  if (e.deltaY === 0) return;
  const nested = findNestedScrollableY(e.target, outer);
  if (!nested || nested === outer) return;

  const max = nested.scrollHeight - nested.clientHeight;
  const top = nested.scrollTop;
  const atTop = top <= 0;
  const atBottom = top >= max - 1;

  if (!((e.deltaY < 0 && atTop) || (e.deltaY > 0 && atBottom))) return;

  const outerMax = outer.scrollHeight - outer.clientHeight;
  if (outerMax <= 0) return;

  const prev = outer.scrollTop;
  outer.scrollTop = Math.min(outerMax, Math.max(0, prev + e.deltaY));
  if (outer.scrollTop !== prev) {
    e.preventDefault();
  }
}

export function attachScrollChain(outer: HTMLElement): () => void {
  const onWheel = (e: WheelEvent) => chainWheelToOuter(outer, e);
  outer.addEventListener("wheel", onWheel, { passive: false });
  return () => outer.removeEventListener("wheel", onWheel);
}
