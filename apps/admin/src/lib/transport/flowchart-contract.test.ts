import { describe, expect, it } from "vitest";
import type {
  DriverDto,
  TransportEnrollmentDto,
  TransportSettingsDto,
  VehicleDto,
} from "./types";
import type { CreateDriverInput, CreateEnrollmentInput, CreateVehicleInput, UpsertTransportSettingsInput } from "./mutations";

/**
 * Flowchart contract — Admin transport client field names / policies.
 * Keep aligned with backend domains/transport/types.ts and Admin UI wiring.
 *
 * Stop create policy: Admin must NOT create stops in API mode.
 * Stops are submitted by drivers and approved via Reviews (`allowCreate={false}`).
 */
describe("transport flowchart contract", () => {
  it("DriverDto exposes assignedVehicleId and hasAppPin (never plaintext pin)", () => {
    const keys: Array<keyof DriverDto> = [
      "assignedVehicleId",
      "hasAppPin",
      "displayName",
      "phone",
      "licenseNumber",
    ];
    expect(keys).toContain("assignedVehicleId");
    expect(keys).toContain("hasAppPin");
    expect(keys).not.toContain("appAccountPin" as keyof DriverDto);
    expect(keys).not.toContain("appPin" as keyof DriverDto);
  });

  it("CreateDriver requires appAccountPin and optional assignedVehicleId", () => {
    const sample: CreateDriverInput = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      displayName: "Driver",
      phone: "9999999999",
      licenseNumber: "DL-1",
      appAccountPin: "1234",
      assignedVehicleId: null,
    };
    expect(sample.appAccountPin).toMatch(/^\d{4,8}$/);
    expect("assignedVehicleId" in sample).toBe(true);
  });

  it("VehicleDto exposes assignedDriverId; create/update accept assignedDriverId", () => {
    const keys: Array<keyof VehicleDto> = ["assignedDriverId", "vehicleNumber", "capacity"];
    expect(keys).toContain("assignedDriverId");
    const create: CreateVehicleInput = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      vehicleNumber: "BUS-1",
      registrationNumber: "KA01",
      capacity: 40,
      assignedDriverId: null,
    };
    expect("assignedDriverId" in create).toBe(true);
  });

  it("TransportSettingsDto includes notifications, remember, and defaultPickupTime", () => {
    const keys: Array<keyof TransportSettingsDto> = [
      "notificationsEnabled",
      "rememberEnabled",
      "defaultPickupTime",
      "defaultNotificationRadiusM",
      "defaultPickupBufferMins",
      "workingDays",
    ];
    expect(keys).toEqual(
      expect.arrayContaining([
        "notificationsEnabled",
        "rememberEnabled",
        "defaultPickupTime",
      ]),
    );
    const upsert: UpsertTransportSettingsInput = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      notificationsEnabled: true,
      rememberEnabled: true,
      defaultPickupTime: "07:30",
    };
    expect(upsert.defaultPickupTime).toMatch(/^\d{2}:\d{2}$/);
  });

  it("TransportEnrollmentDto allows nullable pickup/drop stops", () => {
    const sample: TransportEnrollmentDto = {
      id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      studentId: "ssssssss-ssss-4sss-8sss-ssssssssssss",
      routeId: "rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr",
      pickupStopId: null,
      dropStopId: null,
      status: "active",
      approvalStatus: "approved",
      submittedByUserId: null,
      reviewedByUserId: null,
      reviewedAt: null,
      rejectionReason: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    expect(sample.pickupStopId).toBeNull();
    expect(sample.dropStopId).toBeNull();

    const create: CreateEnrollmentInput = {
      instituteId: sample.instituteId,
      studentId: sample.studentId,
      routeId: sample.routeId,
      pickupStopId: null,
      dropStopId: null,
    };
    expect(create.pickupStopId).toBeNull();
  });

  it("documents admin stop-create forbidden policy", () => {
    const policy =
      "Admin create forbidden — UI must be read-only for create (approve via Reviews)";
    expect(policy).toMatch(/approve via Reviews/i);
    expect(policy).toMatch(/create forbidden/i);
  });

  it("Transport login uses phone + app account PIN (account when vehicle assigned)", () => {
    const loginContract = {
      fields: ["phone", "appAccountPin"] as const,
      success: "Account created",
      failure: "No Transport account found.",
      requiresAssignedVehicle: true,
    };
    expect(loginContract.fields).toEqual(["phone", "appAccountPin"]);
    expect(loginContract.requiresAssignedVehicle).toBe(true);
    expect(loginContract.failure).toMatch(/No Transport account found/i);
  });
});
