/**
 * Class-period map helpers for subject write/read paths.
 * Write path rejects invalid entries; read path strips legacy junk safely.
 */

import { AppError } from "../../errors/app-error.js";

const MAX_PERIODS = 40;

/** Strip invalid entries when reading legacy/dirty DB rows into DTOs. */
export function normalizeClassPeriodsForRead(
  raw: Record<string, number> | null | undefined,
): Record<string, number> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    const key = code.trim();
    const n = typeof value === "number" ? value : Number(value);
    if (!key || !Number.isFinite(n) || n < 1) continue;
    out[key] = Math.floor(n);
  }
  return out;
}

/**
 * Validate write payloads: every entry must be an integer in [1, 40].
 * Does not silently drop invalid keys (that would hide client bugs).
 */
export function assertClassPeriodsForWrite(
  raw: Record<string, number> | null | undefined,
): Record<string, number> {
  if (raw == null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw AppError.validation("class_periods must be an object map", {
      class_periods: ["Must be a map of class_code → periods"],
    });
  }
  const out: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    const key = code.trim();
    if (!key) {
      throw AppError.validation("class_periods keys must be non-empty class codes", {
        class_periods: ["Empty class code key"],
      });
    }
    const n = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > MAX_PERIODS) {
      throw AppError.validation("class_periods values must be integers from 1 to 40", {
        class_periods: [`Invalid periods for ${key}`],
      });
    }
    out[key] = n;
  }
  return out;
}

/** Deduplicate class codes while preserving first-seen order. */
export function uniqueClassCodes(codes: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of codes) {
    const code = raw.trim();
    if (!code) continue;
    const key = code.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(code);
  }
  return out;
}
