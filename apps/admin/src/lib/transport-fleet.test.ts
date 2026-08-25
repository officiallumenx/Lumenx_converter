import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  findDriverAccountByAdminDriverId,
  findDriverAccountByPhone,
  loadTransportOps,
} from "@lumenx/utils";
import {
  createDriverTransportAccount,
  getVehicleDetail,
  loadTransportSnapshot,
  saveTransportSnapshot,
  upsertDriver,
  upsertVehicle,
} from "./transport-store";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => store.clear(),
  key: (index: number) => [...store.keys()][index] ?? null,
  get length() {
    return store.size;
  },
});

vi.mock("@lumenx/types", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@lumenx/types")>();
  return {
    ...actual,
    readDemoProfileId: () => "multi_institute" as const,
  };
});

describe("transport fleet management", () => {
  beforeEach(() => {
    store.clear();
    saveTransportSnapshot(loadTransportSnapshot());
    loadTransportOps();
  });

  it("creates a bus with driver assignment and route", () => {
    let snapshot = loadTransportSnapshot();
    snapshot = upsertDriver(snapshot, {
      name: "Vikram Singh",
      phone: "+91 98765 49999",
      licenseNumber: "DL-9999-2025",
      licenseExpiry: "2028-01-01",
      assignedVehicleId: null,
      status: "active",
      notes: "",
    });
    const driver = snapshot.drivers.at(-1)!;

    snapshot = upsertVehicle(snapshot, {
      vehicleNumber: "BUS-09",
      registrationNumber: "KA-09-LX-9999",
      capacity: 36,
      status: "active",
      assignedDriverId: driver.id,
      notes: "New demo bus",
    });
    const vehicle = snapshot.vehicles.find((v) => v.vehicleNumber === "BUS-09")!;

    expect(vehicle.assignedDriverId).toBe(driver.id);
    expect(snapshot.drivers.find((d) => d.id === driver.id)?.assignedVehicleId).toBe(vehicle.id);

    const route = snapshot.routes.find((r) => r.vehicleId === vehicle.id);
    expect(route).toBeTruthy();
    expect(route?.driverId).toBe(driver.id);
    expect(route?.configStatus).toBe("not_configured");
  });

  it("reassigns driver when bus driver changes", () => {
    let snapshot = loadTransportSnapshot();
    const bus = snapshot.vehicles[0]!;
    const otherDriver = snapshot.drivers.find((d) => d.id !== bus.assignedDriverId)!;

    snapshot = upsertVehicle(snapshot, {
      ...bus,
      assignedDriverId: otherDriver.id,
    });

    const updatedBus = snapshot.vehicles.find((v) => v.id === bus.id)!;
    expect(updatedBus.assignedDriverId).toBe(otherDriver.id);
    expect(snapshot.drivers.find((d) => d.id === otherDriver.id)?.assignedVehicleId).toBe(bus.id);
  });

  it("creates and syncs a driver transport account", () => {
    let snapshot = loadTransportSnapshot();
    snapshot = upsertDriver(snapshot, {
      name: "Neha Patel",
      phone: "+91 98765 48888",
      licenseNumber: "DL-8888-2025",
      licenseExpiry: "",
      assignedVehicleId: null,
      status: "active",
      notes: "",
    });
    const driver = snapshot.drivers.at(-1)!;
    createDriverTransportAccount(snapshot, driver.id);

    const account = findDriverAccountByAdminDriverId(driver.id);
    expect(account).toMatchObject({
      name: "Neha Patel",
      phoneDigits: "9876548888",
      status: "active",
    });
    expect(findDriverAccountByPhone("9876548888")?.employeeId).toMatch(/^DRV-/);
  });

  it("returns bus details with driver, route, and counts", () => {
    const snapshot = loadTransportSnapshot();
    const vehicle = snapshot.vehicles[0]!;
    const detail = getVehicleDetail(snapshot, vehicle.id);

    expect(detail).toBeTruthy();
    expect(detail?.vehicle.vehicleNumber).toBe(vehicle.vehicleNumber);
    expect(detail?.driver).toBeTruthy();
    expect(detail?.route).toBeTruthy();
    expect(detail?.driverAccount).toBeTruthy();
    expect(detail?.totalStudents).toBeGreaterThan(0);
  });
});
