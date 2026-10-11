import { describe, expect, it } from "vitest";
import { connectQueryKeys } from "./keys";
import {
  CONNECT_QUERY_USER_PLACEHOLDER,
  connectKeyBelongsToUser,
  connectKeyUserId,
  scopedConnectKey,
} from "./scope";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CHILD = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("scopedConnectKey isolation", () => {
  it("User A cache key cannot satisfy User B", () => {
    const a = scopedConnectKey(USER_A, connectQueryKeys.parentPortal(INST_A, CHILD));
    const b = scopedConnectKey(USER_B, connectQueryKeys.parentPortal(INST_A, CHILD));
    expect(a).not.toEqual(b);
    expect(connectKeyBelongsToUser(a, USER_A)).toBe(true);
    expect(connectKeyBelongsToUser(a, USER_B)).toBe(false);
  });

  it("Institute A key cannot satisfy Institute B", () => {
    const a = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_A));
    const b = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_B));
    expect(a).not.toEqual(b);
    expect(a[2]).toBe(INST_A);
    expect(b[2]).toBe(INST_B);
  });

  it("places userId after root and never embeds secrets", () => {
    const key = scopedConnectKey(USER_A, connectQueryKeys.inbox(INST_A, "parent"));
    expect(key[0]).toBe("inbox");
    expect(key[1]).toBe(USER_A);
    expect(connectKeyUserId(key)).toBe(USER_A);
    expect(JSON.stringify(key)).not.toMatch(/token|password|otp|secret/i);
  });

  it("anonymous placeholder is not dehydrate-safe", () => {
    const key = scopedConnectKey(null, connectQueryKeys.events(INST_A));
    expect(connectKeyUserId(key)).toBe(CONNECT_QUERY_USER_PLACEHOLDER);
  });
});
