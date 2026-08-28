import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadTransportVehiclesList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listTransportVehicles = vi.fn();
    vi.doMock("./api", () => ({ listTransportVehicles }));
    const { loadTransportVehiclesList } = await import("./load");
    const result = await loadTransportVehiclesList(INST);
    expect(result.status).toBe("demo");
    expect(listTransportVehicles).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTransportVehicles = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listTransportVehicles, listTransportDrivers: vi.fn() }));
    const { loadTransportVehiclesList } = await import("./load");
    const result = await loadTransportVehiclesList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});

describe("loadTransportDriversList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTransportDrivers = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({
      listTransportVehicles: vi.fn(),
      listTransportDrivers,
      listTransportRoutes: vi.fn(),
      listTransportStops: vi.fn(),
      getTransportSettings: vi.fn(),
    }));
    const { loadTransportDriversList } = await import("./load");
    const result = await loadTransportDriversList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});

describe("loadTransportRoutesList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTransportRoutes = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({
      listTransportVehicles: vi.fn(),
      listTransportDrivers: vi.fn(),
      listTransportRoutes,
      listTransportStops: vi.fn(),
      getTransportSettings: vi.fn(),
    }));
    const { loadTransportRoutesList } = await import("./load");
    const result = await loadTransportRoutesList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});

describe("loadTransportSettings", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getTransportSettings = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({
      listTransportVehicles: vi.fn(),
      listTransportDrivers: vi.fn(),
      listTransportRoutes: vi.fn(),
      listTransportStops: vi.fn(),
      getTransportSettings,
    }));
    const { loadTransportSettings } = await import("./load");
    const result = await loadTransportSettings(INST);
    expect(result.status).toBe("forbidden");
    expect(result.settings).toBeNull();
  });
});

describe("loadTransportEnrollmentsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listTransportEnrollments = vi.fn();
    vi.doMock("./api", () => ({ listTransportEnrollments }));
    const { loadTransportEnrollmentsList } = await import("./load");
    const result = await loadTransportEnrollmentsList(INST);
    expect(result.status).toBe("demo");
    expect(listTransportEnrollments).not.toHaveBeenCalled();
  });
});
