import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { removeConnectPortalQueries } from "./invalidate";
import { connectQueryKeys, connectQueryRoots } from "./keys";
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

  it("switching linked child cannot reuse prior child portal cache entry", () => {
    const client = new QueryClient();
    const childA = scopedConnectKey(
      USER_A,
      connectQueryKeys.parentPortal(INST_A, "child-a"),
    );
    const childB = scopedConnectKey(
      USER_A,
      connectQueryKeys.parentPortal(INST_A, "child-b"),
    );
    const attendanceA = scopedConnectKey(
      USER_A,
      connectQueryKeys.attendanceLearner(INST_A, "child-a", "2026-08-01", "2026-08-31"),
    );
    const attendanceB = scopedConnectKey(
      USER_A,
      connectQueryKeys.attendanceLearner(INST_A, "child-b", "2026-08-01", "2026-08-31"),
    );

    client.setQueryData(childA, { child: "a" });
    client.setQueryData(attendanceA, { days: ["private-a"] });

    expect(client.getQueryData(childB)).toBeUndefined();
    expect(client.getQueryData(attendanceB)).toBeUndefined();
    expect(childA).not.toEqual(childB);
    expect(attendanceA).not.toEqual(attendanceB);
  });

  it("role/account switch foreign wipe cannot leave prior user module prefetches addressable", () => {
    const client = new QueryClient();
    const priorTransport = scopedConnectKey(
      USER_A,
      connectQueryKeys.transportLearner(INST_A, "child-a"),
    );
    const priorFees = scopedConnectKey(
      USER_A,
      connectQueryKeys.feesStudent(INST_A, "child-a"),
    );
    client.setQueryData(priorTransport, { live: true });
    client.setQueryData(priorFees, { dues: 1 });

    removeForeignUserConnectQueries(client, USER_B);

    expect(client.getQueryData(priorTransport)).toBeUndefined();
    expect(client.getQueryData(priorFees)).toBeUndefined();
    expect(
      client.getQueryData(
        scopedConnectKey(USER_B, connectQueryKeys.transportLearner(INST_A, "child-a")),
      ),
    ).toBeUndefined();
  });

  it("removeConnectPortalQueries drops teacher/parent/student portal roots on logout", () => {
    const client = new QueryClient();
    const teacherKey = scopedConnectKey(USER_A, connectQueryKeys.teacherPortal(INST_A));
    const parentKey = scopedConnectKey(USER_A, connectQueryKeys.parentPortal(INST_A, "child-1"));
    const studentKey = scopedConnectKey(USER_A, connectQueryKeys.studentPortal(INST_A));
    const marksKey = scopedConnectKey(USER_A, connectQueryKeys.marksParent(INST_A));

    client.setQueryData(teacherKey, { role: "teacher" });
    client.setQueryData(parentKey, { role: "parent" });
    client.setQueryData(studentKey, { role: "student" });
    client.setQueryData(marksKey, { keep: true });

    removeConnectPortalQueries(client);

    expect(client.getQueryData(teacherKey)).toBeUndefined();
    expect(client.getQueryData(parentKey)).toBeUndefined();
    expect(client.getQueryData(studentKey)).toBeUndefined();
    // Module caches are not cleared by portal-root logout helper (caller must soft-refresh / foreign wipe).
    expect(client.getQueryData(marksKey)).toEqual({ keep: true });
    expect(connectQueryRoots.teacherPortal).toBe("teacher-portal");
  });
});
