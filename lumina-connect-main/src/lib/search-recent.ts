const KEY = "ues_search_recent";
const MAX = 6;

export type RecentSearchItem = { label: string; path: string; at: number };

export function getRecentSearches(): RecentSearchItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentSearchItem[];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(item: Pick<RecentSearchItem, "label" | "path">) {
  try {
    const prev = getRecentSearches().filter((x) => x.path !== item.path);
    const next: RecentSearchItem[] = [{ ...item, at: Date.now() }, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    void 0;
  }
}
