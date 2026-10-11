import {
  keepPreviousData,
  useQuery,
  type UseQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { isInstituteUuid } from "@/lib/active-institute";
import { asAdminQueryResult } from "./query-result";

export function instituteEnabled(
  instituteId: string | null | undefined,
  enabled: boolean,
): boolean {
  return (
    enabled && Boolean(instituteId) && isInstituteUuid(instituteId ?? "")
  );
}

/** useQuery wrapper: convert loader `{ status: "error" }` payloads into thrown errors. */
export function useAdminQuery<
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
) {
  const { queryFn, ...rest } = options;
  return useQuery({
    placeholderData: keepPreviousData,
    ...rest,
    queryFn: queryFn
      ? async (ctx) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const raw = await (queryFn as any)(ctx);
          return asAdminQueryResult(raw) as TQueryFnData;
        }
      : undefined,
  });
}
