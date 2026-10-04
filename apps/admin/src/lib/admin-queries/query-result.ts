import { ApiClientError } from "@/lib/api";

type StatusBearing = {
  status?: string;
  errorMessage?: string | null;
};

/**
 * List loaders often return `{ status: "error" }` instead of throwing.
 * That makes TanStack Query treat the failure as a successful cache entry
 * (and with long staleTime, reconnect never refetches). Throw so RQ keeps
 * prior good data, marks the query as error, and retries on reconnect.
 */
export function asAdminQueryResult<T>(result: T): T {
  if (!result || typeof result !== "object") return result;
  const status = (result as StatusBearing).status;
  if (status !== "error" && status !== "forbidden") return result;

  const message =
    typeof (result as StatusBearing).errorMessage === "string" &&
    (result as StatusBearing).errorMessage!.trim()
      ? (result as StatusBearing).errorMessage!.trim()
      : status === "forbidden"
        ? "Access denied"
        : "Request failed";

  const authMiss = /authentication required|invalid or expired/i.test(message);
  throw new ApiClientError({
    status: status === "forbidden" ? 403 : authMiss ? 401 : 0,
    code: status === "forbidden" ? "FORBIDDEN" : authMiss ? "UNAUTHENTICATED" : "NETWORK_ERROR",
    message,
  });
}
