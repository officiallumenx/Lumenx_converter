import { describe, expect, it } from "vitest";
import { nextGpsHealthAction } from "./gps-health-reminder.js";
import { TRANSPORT_EVENT } from "./transport-events.js";

describe("nextGpsHealthAction", () => {
  it("healthy → stale once", () => {
    expect(nextGpsHealthAction(6, []).action).toBe("stale");
    expect(
      nextGpsHealthAction(8, [{ kind: TRANSPORT_EVENT.GPS_STALE }]).action,
    ).toBe("none");
  });

  it("stale → offline once", () => {
    expect(
      nextGpsHealthAction(22, [{ kind: TRANSPORT_EVENT.GPS_STALE }]).action,
    ).toBe("offline");
    expect(
      nextGpsHealthAction(25, [{ kind: TRANSPORT_EVENT.GPS_OFFLINE }]).action,
    ).toBe("none");
  });

  it("offline → recover once, then new stale episode", () => {
    const recover = nextGpsHealthAction(2, [
      { kind: TRANSPORT_EVENT.GPS_OFFLINE },
    ]);
    expect(recover).toEqual({ action: "recover", episode: 0 });

    const afterRecover = nextGpsHealthAction(7, [
      { kind: TRANSPORT_EVENT.GPS_OFFLINE },
      { kind: TRANSPORT_EVENT.GPS_RECOVERED },
    ]);
    expect(afterRecover).toEqual({ action: "stale", episode: 1 });
  });

  it("does not spam while remaining healthy", () => {
    expect(
      nextGpsHealthAction(1, [{ kind: TRANSPORT_EVENT.GPS_RECOVERED }]).action,
    ).toBe("none");
  });
});
