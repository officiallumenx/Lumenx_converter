import { isApiAuthMode } from "@/auth/auth-mode";
import { listComplaints } from "./api";
import type { ComplaintDto } from "./types";

/** Principal/Admin queue — pending, review, or forwarded (not terminal). */
export function countAdminComplaintsFromDtos(dtos: ComplaintDto[]): number {
  return dtos.filter(
    (c) =>
      c.destination === "principal_admin" &&
      (c.status === "pending" || c.status === "review" || c.status === "forwarded"),
  ).length;
}

let cachedCount = 0;
let cachedInstituteId: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function getAdminComplaintsPendingCount(): number {
  return cachedCount;
}

export function subscribeAdminComplaintsPendingCount(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshAdminComplaintsPendingCount(
  instituteId: string | null,
): Promise<number> {
  if (!isApiAuthMode() || !instituteId) {
    cachedCount = 0;
    cachedInstituteId = null;
    emit();
    return 0;
  }

  try {
    const dtos = await listComplaints({ instituteId });
    cachedCount = countAdminComplaintsFromDtos(dtos);
    cachedInstituteId = instituteId;
  } catch {
    cachedCount = 0;
  }
  emit();
  return cachedCount;
}

export function invalidateAdminComplaintsPendingCount(): void {
  cachedCount = 0;
  cachedInstituteId = null;
  emit();
}

export function adminComplaintsPendingInstituteId(): string | null {
  return cachedInstituteId;
}
