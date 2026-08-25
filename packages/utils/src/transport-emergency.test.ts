import { beforeEach, describe, expect, it, vi } from "vitest";

const memory = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
});

vi.stubGlobal("window", {
  dispatchEvent: () => true,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
});

const baseInput = {
  driverId: "DRV-01",
  driverName: "Rajesh",
  vehicleId: "VH-01",
  vehicleNumber: "BUS-01",
  routeCode: "NCL",
  routeName: "North Campus",
  latitude: 28.7,
  longitude: 77.1,
};

describe("transport emergency lifecycle", () => {
  beforeEach(() => {
    memory.clear();
    vi.resetModules();
  });

  it("creates SOS, blocks duplicate, acknowledges, resolves", async () => {
    const em = await import("./transport-emergency");
    em.resetTransportEmergencies();

    const created = em.createTransportEmergency(baseInput);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.emergency.status).toBe("active");
    expect(created.emergency.latitude).toBe(28.7);

    const dup = em.createTransportEmergency(baseInput);
    expect(dup.ok).toBe(false);
    if (dup.ok) return;
    expect(dup.emergency.id).toBe(created.emergency.id);

    const ack = em.acknowledgeTransportEmergency({
      id: created.emergency.id,
      acknowledgedBy: "Admin",
    });
    expect(ack?.status).toBe("acknowledged");
    expect(ack?.acknowledgedBy).toBe("Admin");

    const resolved = em.resolveTransportEmergency({
      id: created.emergency.id,
      resolvedBy: "Admin",
      note: "Help dispatched",
    });
    expect(resolved?.status).toBe("resolved");
    expect(resolved?.resolveNote).toBe("Help dispatched");
    expect(em.listActiveTransportEmergencies().some((e) => e.id === created.emergency.id)).toBe(
      false,
    );
    expect(em.listResolvedTransportEmergencies().some((e) => e.id === created.emergency.id)).toBe(
      true,
    );
  });
});
