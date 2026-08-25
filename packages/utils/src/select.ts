/**
 * Narrow a string (e.g. select `onChange` value) to a known union member.
 * Returns `undefined` when the value is not in `allowed` — callers keep existing fallbacks.
 */
export function parseSelectValue<T extends string>(
  value: string,
  allowed: readonly T[],
): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Assert a select value is one of `allowed`, otherwise return `fallback`. */
export function coerceSelectValue<T extends string>(
  value: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return parseSelectValue(value, allowed) ?? fallback;
}
