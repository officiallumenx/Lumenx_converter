/**
 * Walk repository cursor pages until enough authorized items fill `limit`,
 * or the repository is exhausted. Preserves cursor contracts for clients
 * that continue while `hasMore && nextCursor`.
 */

export type RepoPage<TRow> = {
  rows: TRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type FilledPage<TItem> = {
  items: TItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

const DEFAULT_MAX_FETCHES = 20;

export async function fillAuthorizedPage<TRow, TItem>(opts: {
  limit: number;
  cursor: string | null | undefined;
  fetchPage: (cursor: string | null) => Promise<RepoPage<TRow>>;
  mapAuthorized: (rows: TRow[]) => TItem[] | Promise<TItem[]>;
  maxFetches?: number;
}): Promise<FilledPage<TItem>> {
  const limit = Math.max(1, opts.limit);
  const maxFetches = opts.maxFetches ?? DEFAULT_MAX_FETCHES;
  const items: TItem[] = [];
  let cursor: string | null = opts.cursor?.trim() || null;
  let nextCursor: string | null = null;
  let hasMore = false;
  let fetches = 0;

  while (items.length < limit && fetches < maxFetches) {
    const page = await opts.fetchPage(cursor);
    fetches += 1;
    // Append the whole authorized set for this repo page (never mid-page slice)
    // so the next cursor cannot skip remaining authorized rows on the same page.
    const authorized = await opts.mapAuthorized(page.rows);
    items.push(...authorized);
    nextCursor = page.nextCursor;
    hasMore = page.hasMore;
    if (!page.hasMore || !page.nextCursor) {
      hasMore = false;
      nextCursor = null;
      break;
    }
    if (items.length >= limit) break;
    // More repo rows exist — advance even if this page yielded zero authorized.
    cursor = page.nextCursor;
  }

  return { items, nextCursor: hasMore ? nextCursor : null, hasMore };
}
