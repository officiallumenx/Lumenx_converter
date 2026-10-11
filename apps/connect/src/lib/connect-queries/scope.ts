/**
 * Authenticated-user scoping for Connect TanStack Query keys.
 * Inserts userId after the root so User A and User B never share cache entries,
 * even if institute/student ids collide in memory.
 */
export const CONNECT_QUERY_USER_PLACEHOLDER = "__none__" as const;

export function normalizeConnectQueryUserId(
  userId: string | null | undefined,
): string {
  const trimmed = typeof userId === "string" ? userId.trim() : "";
  return trimmed || CONNECT_QUERY_USER_PLACEHOLDER;
}

/**
 * [root, ...rest] → [root, userId, ...rest]
 * Never put tokens/secrets in keys — only the stable auth user id.
 */
export function scopedConnectKey(
  userId: string | null | undefined,
  key: readonly unknown[],
): readonly unknown[] {
  if (key.length === 0) {
    return [normalizeConnectQueryUserId(userId)] as const;
  }
  const [root, ...rest] = key;
  return [root, normalizeConnectQueryUserId(userId), ...rest] as const;
}

/** True when a key was built for a different authenticated user. */
export function connectKeyUserId(key: readonly unknown[]): string | null {
  if (key.length < 2 || typeof key[1] !== "string") return null;
  return key[1];
}

export function connectKeyBelongsToUser(
  key: readonly unknown[],
  userId: string | null | undefined,
): boolean {
  const expected = normalizeConnectQueryUserId(userId);
  const actual = connectKeyUserId(key);
  return actual === expected;
}
