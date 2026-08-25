/** In-memory scroll positions for AppShell's custom `<main>` scroller (not window). */
const positions = new Map<string, number>();

export function saveMainScroll(pathname: string, top: number) {
  positions.set(pathname, Math.max(0, top));
}

export function readMainScroll(pathname: string): number {
  return positions.get(pathname) ?? 0;
}

export function clearMainScrollMemory() {
  positions.clear();
}
