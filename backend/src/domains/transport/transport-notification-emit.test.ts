import { beforeEach, describe, expect, it, vi } from "vitest";

const emitNotificationForInstituteSystem = vi.fn();
const findTransportSettings = vi.fn();

vi.mock("../notifications/service.js", () => ({
  emitNotificationForInstituteSystem: (...args: unknown[]) =>
    emitNotificationForInstituteSystem(...args),
}));

vi.mock("./repository.js", () => ({
  findTransportSettings: (...args: unknown[]) => findTransportSettings(...args),
}));

vi.mock("../../logger/logger.js", () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

import { AppError } from "../../errors/app-error.js";
import {
  clearTransportNotificationSettingsCache,
  emitTransportNotification,
  emitTransportNotificationSafe,
} from "./transport-notification-emit.js";

const baseInput = {
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  kind: "TRIP_STARTED",
  title: "Trip started",
  body: "Body",
  recipientUserIds: ["cccccccc-cccc-4ccc-8ccc-cccccccccccc"],
  dedupeKey: "transport:trip:started:parent",
  deepLink: "/transport",
  targetAudience: "parent" as const,
  payload: { tripId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd" },
};

describe("emitTransportNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTransportNotificationSettingsCache();
    findTransportSettings.mockResolvedValue({ notifications_enabled: true });
    emitNotificationForInstituteSystem.mockResolvedValue({ id: "n1" });
  });

  it("returns empty when no recipients", async () => {
    const result = await emitTransportNotification({} as never, {
      ...baseInput,
      recipientUserIds: [],
    });
    expect(result).toEqual({ ok: false, reason: "empty" });
    expect(emitNotificationForInstituteSystem).not.toHaveBeenCalled();
  });

  it("returns disabled when notifications_enabled is false", async () => {
    findTransportSettings.mockResolvedValue({ notifications_enabled: false });
    const result = await emitTransportNotification({} as never, baseInput);
    expect(result).toEqual({ ok: false, reason: "disabled" });
    expect(emitNotificationForInstituteSystem).not.toHaveBeenCalled();
  });

  it("maps unique-violation style AppError to dedupe", async () => {
    emitNotificationForInstituteSystem.mockRejectedValue(
      AppError.conflict("duplicate key"),
    );
    const result = await emitTransportNotification({} as never, baseInput);
    expect(result).toEqual({ ok: false, reason: "dedupe" });
  });

  it("returns ok on successful emit", async () => {
    const result = await emitTransportNotification({} as never, baseInput);
    expect(result).toEqual({ ok: true });
    expect(emitNotificationForInstituteSystem).toHaveBeenCalledTimes(1);
  });

  it("safe wrapper does not throw when emit rejects unexpectedly", async () => {
    emitNotificationForInstituteSystem.mockRejectedValue(new Error("boom"));
    expect(() =>
      emitTransportNotificationSafe({} as never, baseInput),
    ).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  });
});
