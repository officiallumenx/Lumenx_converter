import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  clearTransportNotificationSettingsCache,
  emitTransportNotification,
} from "../src/domains/transport/transport-notification-emit.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "11111111-1111-4111-8111-111111111111";
const PARENT = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  clearTransportNotificationSettingsCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("emitTransportNotification observability", () => {
  it("returns empty when no recipients", async () => {
    const db = emptyMockDb();
    const clients = createMockSupabaseClients({ db });
    const result = await emitTransportNotification(clients.admin!, {
      instituteId: INST,
      createdByUserId: USER,
      kind: "TRIP_STARTED",
      title: "t",
      body: "b",
      deepLink: "/transport",
      targetAudience: "parent",
      dedupeKey: "k1",
      recipientUserIds: [],
    });
    expect(result).toEqual({ ok: false, reason: "empty" });
  });

  it("returns ok and enqueues connect-targeted FCM when parents have connect tokens", async () => {
    const db = emptyMockDb();
    db.user_profile = [
      {
        id: USER,
        display_name: "A",
        email: "a@x.com",
        status: "active",
        deleted_at: null,
      },
      {
        id: PARENT,
        display_name: "P",
        email: "p@x.com",
        status: "active",
        deleted_at: null,
      },
    ];
    db.transport_settings = [
      {
        institute_id: INST,
        notifications_enabled: true,
        deleted_at: null,
      },
    ];
    db.device_token = [
      {
        id: "ff111111-1111-4111-8111-111111111111",
        user_profile_id: PARENT,
        app: "connect",
        platform: "android",
        token: "t1",
        valid: true,
        last_seen_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "ff222222-2222-4222-8222-222222222222",
        user_profile_id: PARENT,
        app: "transport",
        platform: "android",
        token: "t2",
        valid: true,
        last_seen_at: "2026-01-01T00:00:00.000Z",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const clients = createMockSupabaseClients({ db });
    const result = await emitTransportNotification(clients.admin!, {
      instituteId: INST,
      createdByUserId: USER,
      kind: "TRIP_STARTED",
      title: "Trip started",
      body: "Bus left",
      deepLink: "/transport/live",
      targetAudience: "parent",
      dedupeKey: "transport:trip:started:parent:test",
      recipientUserIds: [PARENT],
      payload: { tripId: "trip-1" },
    });
    expect(result.ok).toBe(true);
    const fcm = db.notification_delivery_attempt.filter(
      (r) => r.channel === "fcm",
    );
    expect(fcm).toHaveLength(1);
    expect(fcm[0]?.device_token_id).toBe(
      "ff111111-1111-4111-8111-111111111111",
    );
    const notif = db.notification[db.notification.length - 1];
    expect(notif?.payload).toMatchObject({
      targetApps: ["connect"],
      targetAudience: "parent",
    });
  });
});
