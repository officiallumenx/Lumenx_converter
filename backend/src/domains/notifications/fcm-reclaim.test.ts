import { describe, it, expect, vi, afterEach } from "vitest";
import { reclaimStaleSendingFcmAttempts } from "./repository.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "../../../tests/helpers/mock-supabase.js";

afterEach(() => {
  vi.useRealTimers();
});

function seedSending(db: MockDb, rows: Array<{ id: string; attempted_at: string }>) {
  db.notification_delivery_attempt = rows.map((row) => ({
    id: row.id,
    channel: "fcm",
    status: "sending",
    attempted_at: row.attempted_at,
    error: null,
  }));
}

describe("reclaimStaleSendingFcmAttempts", () => {
  it("only reclaims sending rows older than the cutoff (SQL-side lt filter)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

    const db = emptyMockDb();
    seedSending(db, [
      {
        id: "stale-1",
        attempted_at: "2026-10-29T11:50:00.000Z", // 10m old
      },
      {
        id: "fresh-1",
        attempted_at: "2026-10-29T11:59:30.000Z", // 30s old — not stale
      },
    ]);

    const { admin } = createMockSupabaseClients({ db });
    const reclaimed = await reclaimStaleSendingFcmAttempts(admin, 120_000);
    expect(reclaimed).toBe(1);

    const stale = db.notification_delivery_attempt.find((r) => r.id === "stale-1");
    const fresh = db.notification_delivery_attempt.find((r) => r.id === "fresh-1");
    expect(stale?.status).toBe("pending");
    expect(stale?.error).toBe("reclaimed_stale_sending");
    expect(fresh?.status).toBe("sending");
  });

  it("returns 0 without update when no sending rows are stale", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T12:00:00.000Z"));

    const db = emptyMockDb();
    seedSending(db, [
      {
        id: "fresh-only",
        attempted_at: "2026-10-29T11:59:00.000Z",
      },
    ]);

    const { admin } = createMockSupabaseClients({ db });
    const reclaimed = await reclaimStaleSendingFcmAttempts(admin, 120_000);
    expect(reclaimed).toBe(0);
    expect(db.notification_delivery_attempt[0]?.status).toBe("sending");
  });
});
