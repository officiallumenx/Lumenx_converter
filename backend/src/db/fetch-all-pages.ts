/**
 * Page through PostgREST results so institute-wide exports/aggregates are complete.
 * Default max rows per page matches common Supabase API limits.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "./errors.js";

export const SUPABASE_PAGE_SIZE = 1000;
/** Hard ceiling so a runaway query cannot hang the request indefinitely. */
export const SUPABASE_MAX_ROWS = 50_000;

type FilterBuilder = {
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

/**
 * Execute a filtered select builder in pages until exhausted or SUPABASE_MAX_ROWS.
 * Caller builds the query without `.range()`; this applies paging.
 */
export async function fetchAllPagedRows<T>(
  buildPage: (from: number, to: number) => FilterBuilder | PromiseLike<{ data: unknown; error: unknown }>,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let from = 0;
  let truncated = false;

  while (from < SUPABASE_MAX_ROWS) {
    const to = Math.min(from + SUPABASE_PAGE_SIZE - 1, SUPABASE_MAX_ROWS - 1);
    const result = await buildPage(from, to);
    const page = ensureDbOk(result as { data: unknown; error: unknown }) as T[];
    rows.push(...page);
    if (page.length < SUPABASE_PAGE_SIZE) {
      return { rows, truncated: false };
    }
    from += SUPABASE_PAGE_SIZE;
    if (from >= SUPABASE_MAX_ROWS) {
      truncated = true;
      break;
    }
  }

  return { rows, truncated };
}

/** Convenience for simple table selects with optional query mutator. */
export async function fetchTablePaged<T>(
  admin: SupabaseClient,
  table: string,
  select: string,
  apply: (query: ReturnType<SupabaseClient["from"]>) => unknown,
): Promise<{ rows: T[]; truncated: boolean }> {
  return fetchAllPagedRows<T>((from, to) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = admin.from(table).select(select);
    query = apply(query) ?? query;
    return query.range(from, to);
  });
}
