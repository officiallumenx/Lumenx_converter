const KEY_PREFIX = "lumenx.connect.search-recent.v1";
const MAX = 6;

export type RecentSearchItem = { label: string; path: string; at: number };

export type SearchRecentScope = {
  /** Current Connect institute id — never share recents across institutes. */
  instituteId: string;
  /** Current portal: parent | student | teacher | activity. */
  portal: string;
};

function storageKey(scope: SearchRecentScope): string {
  return `${KEY_PREFIX}.${scope.instituteId}.${scope.portal}`;
}

export function getRecentSearches(scope: SearchRecentScope): RecentSearchItem[] {
  try {
    const raw = localStorage.getItem(storageKey(scope));
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentSearchItem[];
    return Array.isArray(list) ? list.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecentSearch(
  scope: SearchRecentScope,
  item: Pick<RecentSearchItem, "label" | "path">,
) {
  try {
    const prev = getRecentSearches(scope).filter((x) => x.path !== item.path);
    const next: RecentSearchItem[] = [{ ...item, at: Date.now() }, ...prev].slice(0, MAX);
    localStorage.setItem(storageKey(scope), JSON.stringify(next));
  } catch {
    void 0;
  }
}
