import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { connectQueryKeys } from "./keys";
import { removeForeignUserConnectQueries, shouldDehydrateConnectQuery } from "./persist";
import { connectKeyBelongsToUser, scopedConnectKey } from "./scope";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("Connect query isolation regression", () => {
  it("User A cached query cannot satisfy User B query key", () => {
    const client = new QueryClient();
    const keyA = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_A));
    const keyB = scopedConnectKey(USER_B, connectQueryKeys.studentPortal(INST_A));
    client.setQueryData(keyA, { secret: "user-a-only" });

    expect(client.getQueryData(keyB)).toBeUndefined();
    expect(connectKeyBelongsToUser(keyA, USER_B)).toBe(false);
    expect(connectKeyBelongsToUser(keyB, USER_B)).toBe(true);
  });

  it("Institute A data cannot satisfy Institute B query key", () => {
    const client = new QueryClient();
    const keyA = scopedConnectKey(USER_A, connectQueryKeys.parentPortal(INST_A, "child-1"));
    const keyB = scopedConnectKey(USER_A, connectQueryKeys.parentPortal(INST_B, "child-1"));
    client.setQueryData(keyA, { institute: "A" });

    expect(client.getQueryData(keyB)).toBeUndefined();
    expect(keyA).not.toEqual(keyB);
  });

  it("removeForeignUserConnectQueries drops the previous account's private keys", () => {
    const client = new QueryClient();
    const keyA = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_A));
    const keyB = scopedConnectKey(USER_B, connectQueryKeys.studentPortal(INST_A));

    client.setQueryData(keyA, { secret: "user-a-only" });
    client.setQueryData(keyB, { secret: "user-b-only" });

    removeForeignUserConnectQueries(client, USER_B);

    expect(client.getQueryData(keyA)).toBeUndefined();
    expect(client.getQueryData(keyB)).toEqual({ secret: "user-b-only" });
  });

  it("account switch cannot keep prior user data addressable under new identity", () => {
    const client = new QueryClient();
    const prior = scopedConnectKey(USER_A, connectQueryKeys.marksParent(INST_A));
    client.setQueryData(prior, { marks: "private-a" });

    // Switch: clear foreign, then only User B keys exist.
    removeForeignUserConnectQueries(client, USER_B);
    const next = scopedConnectKey(USER_B, connectQueryKeys.marksParent(INST_A));
    expect(client.getQueryData(prior)).toBeUndefined();
    expect(client.getQueryData(next)).toBeUndefined();
  });

  it("background refresh failure does not erase valid cached content", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const key = scopedConnectKey(USER_A, connectQueryKeys.events(INST_A));
    client.setQueryData(key, [{ id: "cached-event" }]);

    await expect(
      client.fetchQuery({
        queryKey: key,
        queryFn: async () => {
          throw new Error("network down");
        },
      }),
    ).rejects.toThrow("network down");

    // TanStack keeps previous successful data on error when already present.
    expect(client.getQueryData(key)).toEqual([{ id: "cached-event" }]);
    expect(client.getQueryState(key)?.status).toBe("error");
    expect(client.getQueryState(key)?.data).toEqual([{ id: "cached-event" }]);
  });

  it("logout-style clear removes private persisted dehydrate candidates", () => {
    const privateKey = scopedConnectKey(
      USER_A,
      connectQueryKeys.parentPortal(INST_A, INST_A),
    );
    expect(
      shouldDehydrateConnectQuery({
        queryKey: privateKey,
        state: { status: "success" },
      }),
    ).toBe(true);
    // After clear, only __none__/missing user keys remain — and those must not dehydrate.
    expect(
      shouldDehydrateConnectQuery({
        queryKey: scopedConnectKey(null, connectQueryKeys.parentPortal(INST_A, INST_A)),
        state: { status: "success" },
      }),
    ).toBe(false);
  });

  it("session-revocation style: foreign wipe leaves no prior private cache for render", () => {
    const client = new QueryClient();
    const key = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_A));
    client.setQueryData(key, { profile: "sensitive" });
    removeForeignUserConnectQueries(client, null);
    expect(client.getQueryData(key)).toBeUndefined();
  });
});
