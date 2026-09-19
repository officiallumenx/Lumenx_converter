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
    snapshot = upsertDriver(snapshot, {
      name: "Driver A",
      phone: "+91 98765 41111",
      licenseNumber: "DL-A-2025",
      licenseExpiry: "2028-01-01",
      assignedVehicleId: null,
      status: "active",
      notes: "",
    });
    snapshot = upsertDriver(snapshot, {
      name: "Driver B",
      phone: "+91 98765 42222",
      licenseNumber: "DL-B-2025",
      licenseExpiry: "2028-01-01",
      assignedVehicleId: null,
      status: "active",
      notes: "",
    });
    const driverA = snapshot.drivers.find((d) => d.name === "Driver A")!;
    const driverB = snapshot.drivers.find((d) => d.name === "Driver B")!;

    snapshot = upsertVehicle(snapshot, {
      vehicleNumber: "BUS-REASSIGN",
      registrationNumber: "KA-01-LX-1111",
      capacity: 40,
      status: "active",
      assignedDriverId: driverA.id,
      notes: "",
    });
    const bus = snapshot.vehicles.find((v) => v.vehicleNumber === "BUS-REASSIGN")!;

    snapshot = upsertVehicle(snapshot, {
      ...bus,
      assignedDriverId: driverB.id,
    });

    const updatedBus = snapshot.vehicles.find((v) => v.id === bus.id)!;
    expect(updatedBus.assignedDriverId).toBe(driverB.id);
    expect(snapshot.drivers.find((d) => d.id === driverB.id)?.assignedVehicleId).toBe(bus.id);
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
    let snapshot = loadTransportSnapshot();
    snapshot = upsertDriver(snapshot, {
      name: "Detail Driver",
      phone: "+91 98765 43333",
      licenseNumber: "DL-DETAIL-2025",
      licenseExpiry: "2028-01-01",
      assignedVehicleId: null,
      status: "active",
      notes: "",
    });
    const driver = snapshot.drivers.at(-1)!;
    snapshot = upsertVehicle(snapshot, {
      vehicleNumber: "BUS-DETAIL",
      registrationNumber: "KA-01-LX-2222",
      capacity: 40,
      status: "active",
      assignedDriverId: driver.id,
      notes: "",
    });
    createDriverTransportAccount(snapshot, driver.id);
    const vehicle = snapshot.vehicles.find((v) => v.vehicleNumber === "BUS-DETAIL")!;
    const detail = getVehicleDetail(snapshot, vehicle.id);

    expect(detail).toBeTruthy();
    expect(detail?.vehicle.vehicleNumber).toBe(vehicle.vehicleNumber);
    expect(detail?.driver).toBeTruthy();
    expect(detail?.route).toBeTruthy();
    expect(detail?.driverAccount).toBeTruthy();
  });
});
