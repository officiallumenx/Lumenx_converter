export const ADMIN_OFFLINE_API_PAYLOAD_KIND = "admin-api" as const;

export type AdminOfflineApiPayload = {
  kind: typeof ADMIN_OFFLINE_API_PAYLOAD_KIND;
  method: string;
  path: string;
  body?: unknown;
};

export function isAdminOfflineApiPayload(
  payload: Record<string, unknown> | undefined,
): payload is AdminOfflineApiPayload {
  if (!payload || payload.kind !== ADMIN_OFFLINE_API_PAYLOAD_KIND) return false;
  return typeof payload.method === "string" && typeof payload.path === "string";
}

export function moduleLabelFromApiPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  // /api/v1/<resource>/...
  const resource = parts[2] ?? parts[parts.length - 1] ?? "Admin";
  return resource
    .split("-")
    .map((p) => (p ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(" ");
}

export function opFromHttpMethod(
  method: string,
): "create" | "update" | "delete" | "submit" {
  const m = method.toUpperCase();
  if (m === "POST") return "create";
  if (m === "DELETE") return "delete";
  if (m === "PUT" || m === "PATCH") return "update";
  return "submit";
}
