import type { ConnectApiClient } from "./client";

export type ListPageEnvelope<T> = {
  data: T[];
  next_cursor?: string | null;
  has_more?: boolean;
};

export async function fetchAllListPages<T>(
  client: ConnectApiClient,
  buildPath: (cursor: string | undefined) => string,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;
  let guard = 0;
  for (;;) {
    const page = await client.request<ListPageEnvelope<T>>(buildPath(cursor), {
      method: "GET",
      envelope: true,
    });
    const batch = Array.isArray(page?.data) ? page.data : [];
    items.push(...batch);
    const next = page?.next_cursor?.trim() || null;
    const hasMore = Boolean(page?.has_more) && Boolean(next);
    if (!hasMore) break;
    cursor = next!;
    guard += 1;
    if (guard > 500) {
      throw new Error("List pagination exceeded safety page limit");
    }
  }
  return items;
}
