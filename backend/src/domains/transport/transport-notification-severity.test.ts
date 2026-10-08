import { describe, expect, it } from "vitest";
import {
  deepLinkForTransportEvent,
  presentationForSeverity,
  priorityForSeverity,
  severityForTransportEvent,
  transportDedupe,
} from "./transport-notification-severity.js";
import { TRANSPORT_EVENT } from "./transport-events.js";

describe("transport notification severity", () => {
  it("maps arrival/boarding to INFO — never critical/red", () => {
    expect(severityForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED)).toBe("info");
    expect(severityForTransportEvent(TRANSPORT_EVENT.STUDENT_BOARDED)).toBe(
      "info",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.STOP_APPROACHING)).toBe(
      "attention",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED)).toBe(
      "critical",
    );
    expect(priorityForSeverity("info")).toBe("normal");
    expect(priorityForSeverity("info", { positiveOutcome: true })).toBe(
      "success",
    );
    expect(priorityForSeverity("attention")).toBe("important");
    expect(priorityForSeverity("critical")).toBe("critical");
    expect(presentationForSeverity("info", { softChime: true })).toBe("chime");
    expect(presentationForSeverity("critical")).toBe("alert");
  });

  it("builds deterministic dedupe keys", () => {
    expect(transportDedupe.arrived("t1", "s1")).toBe(
      "transport:t1:stop:s1:arrived",
    );
    expect(transportDedupe.boarded("t1", "stu")).toBe(
      "transport:t1:student:stu:boarded",
    );
    expect(transportDedupe.dropped("t1", "stu")).toBe(
      "transport:t1:student:stu:dropped",
    );
    expect(transportDedupe.approach("t1", "stu", 5)).toBe(
      "transport:t1:student:stu:approach:5",
    );
    expect(transportDedupe.schoolArrived("t1", "parent")).toBe(
      "transport:t1:school_arrived:parent",
    );
    expect(
      transportDedupe.reminder("route1", "stu", "pre_pickup", "2026-10-05"),
    ).toBe("transport:route1:reminder:stu:pre_pickup:2026-10-05");
  });

  it("maps deep links by audience", () => {
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED, "parent"),
    ).toBe("/transport/live");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.SCHOOL_ARRIVED, "parent"),
    ).toBe("/transport/live");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.SCHOOL_ARRIVED, "driver"),
    ).toBe("/attendance");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.STUDENT_DROPPED, "parent"),
    ).toBe("/transport/history");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED, "driver"),
    ).toBe("/emergency");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED, "parent"),
    ).toBe("/transport/live");
    expect(
      deepLinkForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED, "admin"),
    ).toBe("/transport");
  });

  it("catalogs push event severity without making all transport red", () => {
    expect(severityForTransportEvent(TRANSPORT_EVENT.STOP_APPROACHING)).toBe(
      "attention",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.STOP_ARRIVED)).toBe("info");
    expect(severityForTransportEvent(TRANSPORT_EVENT.STUDENT_BOARDED)).toBe(
      "info",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.STUDENT_DROPPED)).toBe(
      "info",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.TRIP_DELAYED)).toBe(
      "attention",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.TRIP_NOT_STARTED)).toBe(
      "attention",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.GPS_STALE)).toBe(
      "attention",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.EMERGENCY_CREATED)).toBe(
      "critical",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.EMERGENCY_RESOLVED)).toBe(
      "info",
    );
    expect(severityForTransportEvent(TRANSPORT_EVENT.TRIP_COMPLETED)).toBe(
      "info",
    );
    expect(transportDedupe.gpsStale("trip-1")).toBe("transport:trip-1:gps_stale");
    expect(transportDedupe.tripNotStarted("route-1", "2026-10-06")).toBe(
      "transport:route-1:not_started:2026-10-06",
    );
    expect(transportDedupe.emergencyResolved("em-1", "admin")).toBe(
      "transport:sos_resolved:em-1:admin",
    );
  });
});
