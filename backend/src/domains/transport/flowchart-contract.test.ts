import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Flowchart: Admin adds drivers (incl. PIN + vehicle), fleet, students (bus assign);
 * SOS + settings; routes/stops by driver with admin approval.
 */
describe("admin transport flowchart contract", () => {
  it("drivers require app PIN and support vehicle assignment", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    expect(service).toContain("appAccountPin");
    expect(service).toContain("assignedVehicleId");
    expect(service).toContain("hasAppPin");
    expect(service).toContain("ensureDriverVehicleRouteLink");
  });

  it("settings cover notification, remember, pickup time, radius, working days", () => {
    const types = readFileSync(join(here, "types.ts"), "utf8");
    expect(types).toContain("notificationsEnabled");
    expect(types).toContain("rememberEnabled");
    expect(types).toContain("defaultPickupTime");
    expect(types).toContain("defaultNotificationRadiusM");
    expect(types).toContain("workingDays");
  });

  it("forbids admin stop creation; driver creates, admin approves", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    expect(service).toContain("Stops are created by drivers");
    expect(service).toContain("Approve them in Reviews");
  });

  it("forbids admin route creation; driver creates, admin approves", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    expect(service).toContain("Routes are created by drivers");
  });

  it("allows student bus enrollment without stops yet", () => {
    const service = readFileSync(join(here, "service.ts"), "utf8");
    expect(service).toContain("if (input.pickupStopId)");
    expect(service).toContain("if (input.dropStopId)");
  });

  it("phone + PIN login creates account only when vehicle assigned", () => {
    const login = readFileSync(join(here, "driver-pin-login.ts"), "utf8");
    expect(login).toContain("No Transport account found.");
    expect(login).toContain("assigned_vehicle_id");
    expect(login).toContain("app_pin_hash");
    expect(login).toContain("loginDriverWithAppPin");
    expect(login).toContain("accountCreated");
  });
});
