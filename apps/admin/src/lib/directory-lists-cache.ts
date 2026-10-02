/**
 * Coalesced institute directory lists for Home / widgets / setup.
 * Prevents parallel listTeachers/listStudents bursts that trigger 429.
 */
import {
  ADMIN_CACHE_TTL_MS,
  adminCacheKey,
  cachedAdminFetch,
} from "@/lib/admin-resource-cache";
import { listStudents } from "@/lib/students/api";
import type { StudentDto } from "@/lib/students/types";
import { listTeachers } from "@/lib/teachers/api";
import type { TeacherDto } from "@/lib/teachers/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code: unknown }).code) : "";
  const status =
    "status" in err && typeof (err as { status: unknown }).status === "number"
      ? (err as { status: number }).status
      : 0;
  return code === "RATE_LIMITED" || status === 429;
}

/** Retry a few times on HTTP 429 before failing the coalesced fetch. */
async function withRateLimitRetry<T>(
  fetcher: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetcher();
    } catch (err) {
      lastErr = err;
      if (!isRateLimited(err) || i === attempts - 1) throw err;
      await sleep(700 * 2 ** i);
    }
  }
  throw lastErr;
}

/** Full teachers directory for an institute (no filters) — short TTL + inflight coalesce. */
export function listTeachersCached(instituteId: string): Promise<TeacherDto[]> {
  return cachedAdminFetch(
    adminCacheKey("teachers-dir", instituteId),
    () => withRateLimitRetry(() => listTeachers({ instituteId })),
    { ttlMs: ADMIN_CACHE_TTL_MS },
  );
}

/** Full students directory for an institute (no filters) — short TTL + inflight coalesce. */
export function listStudentsCached(instituteId: string): Promise<StudentDto[]> {
  return cachedAdminFetch(
    adminCacheKey("students-dir", instituteId),
    () => withRateLimitRetry(() => listStudents({ instituteId })),
    { ttlMs: ADMIN_CACHE_TTL_MS },
  );
}
