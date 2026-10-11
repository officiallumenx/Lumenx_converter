import type { AdminApiClient } from "./client";

export type ListPageEnvelope<T> = {
  data: T[];
  next_cursor?: string | null;
  has_more?: boolean;
};

export type ListPageResult<T> = {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Fetch a single cursor page (directory screens should prefer this). */
export async function fetchListPage<T>(
  client: AdminApiClient,
  path: string,
): Promise<ListPageResult<T>> {
  const page = await client.request<ListPageEnvelope<T>>(path, {
    method: "GET",
    envelope: true,
  });
  const items = Array.isArray(page?.data) ? page.data : [];
  const nextCursor = page?.next_cursor?.trim() || null;
  const hasMore = Boolean(page?.has_more) && Boolean(nextCursor);
  return { items, nextCursor, hasMore };
}

/**
 * Walk cursor pages until exhausted. Keeps directory consumers able to load
 * every matching row without a silent PostgREST max-rows cut-off.
 * Prefer fetchListPage + incremental UI for large Admin directories.
 */
export async function fetchAllListPages<T>(
  client: AdminApiClient,
  buildPath: (cursor: string | undefined) => string,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  let guard = 0;
  for (;;) {
    const page = await fetchListPage<T>(client, buildPath(cursor));
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
    guard += 1;
    if (guard > 500) {
      throw new Error("List pagination exceeded safety page limit");
    }
  }
  return items;
}
