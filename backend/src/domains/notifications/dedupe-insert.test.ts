import { describe, expect, it, vi } from "vitest";
import {
  findNotificationByInstituteDedupeKey,
  insertNotification,
  isNotificationInstituteDedupeConflict,
} from "./repository.js";
import type { EmitNotificationInput } from "./types.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACTOR = "11111111-1111-4111-8111-111111111111";

function baseInput(
  overrides: Partial<EmitNotificationInput> = {},
): EmitNotificationInput & { createdByUserProfileId: string } {
  return {
    instituteId: INST,
    category: "system",
    title: "Hello",
    body: "World",
    recipientUserIds: [ACTOR],
    createdByUserProfileId: ACTOR,
    ...overrides,
  };
}

describe("isNotificationInstituteDedupeConflict", () => {
  it("detects the production constraint name", () => {
    expect(
      isNotificationInstituteDedupeConflict({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "notification_institute_dedupe_uidx"',
        details:
          "Key (institute_id, dedupe_key)=(aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, diary-reminder:x:subject:2026-10-28) already exists.",
      }),
    ).toBe(true);
  });

  it("ignores unrelated unique violations", () => {
    expect(
      isNotificationInstituteDedupeConflict({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "subject_institute_code_key"',
        details: "Key (institute_id, code)=(…, MATH) already exists.",
      }),
    ).toBe(false);
  });
});

describe("insertNotification dedupe", () => {
  it("returns the existing row without insert when dedupe key already exists", async () => {
    const existing = {
      id: "n-existing",
      institute_id: INST,
      dedupe_key: "fee-publish:plan-1",
      deleted_at: null,
      title: "Prior",
      body: "Prior body",
    };
    const insert = vi.fn();
    const admin = {
      from: vi.fn((table: string) => {
        expect(table).toBe("notification");
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: async () => ({ data: existing, error: null }),
                }),
              }),
            }),
          }),
          insert,
        };
      }),
    };

    const result = await insertNotification(admin as never, baseInput({
      dedupeKey: "fee-publish:plan-1",
    }));

    expect(result.created).toBe(false);
    expect(result.notification.id).toBe("n-existing");
    expect(insert).not.toHaveBeenCalled();
  });

  it("recovers from concurrent 23505 by re-reading the winning row", async () => {
    const winner = {
      id: "n-winner",
      institute_id: INST,
      dedupe_key: "transport:trip:1:started:parent",
      deleted_at: null,
      title: "Trip started",
      body: "Bus left",
    };
    let findCalls = 0;
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => {
                  findCalls += 1;
                  // First pre-check misses (race); post-conflict find hits.
                  if (findCalls === 1) return { data: null, error: null };
                  return { data: winner, error: null };
                },
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: {
                code: "23505",
                message:
                  'duplicate key value violates unique constraint "notification_institute_dedupe_uidx"',
                details: `Key (institute_id, dedupe_key)=(${INST}, transport:trip:1:started:parent) already exists.`,
              },
            }),
          }),
        }),
      })),
    };

    const result = await insertNotification(admin as never, baseInput({
      dedupeKey: "transport:trip:1:started:parent",
    }));

    expect(result.created).toBe(false);
    expect(result.notification.id).toBe("n-winner");
    expect(findCalls).toBe(2);
  });

  it("still surfaces unrelated database errors", async () => {
    const admin = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              is: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: async () => ({
              data: null,
              error: {
                code: "23503",
                message: "insert or update on table violates foreign key constraint",
              },
            }),
          }),
        }),
      })),
    };

    await expect(
      insertNotification(admin as never, baseInput({ dedupeKey: "x" })),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("findNotificationByInstituteDedupeKey", () => {
  it("returns null for blank keys without querying", async () => {
    const from = vi.fn();
    const row = await findNotificationByInstituteDedupeKey(
      { from } as never,
      INST,
      "   ",
    );
    expect(row).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
});
