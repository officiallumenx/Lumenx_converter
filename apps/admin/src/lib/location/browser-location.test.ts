import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AdminLocationError,
  adminLocationUserMessage,
  detectCurrentLocation,
  isGeolocationApiAvailable,
  isSecureLocationContext,
  queryGeolocationPermissionHint,
} from "./browser-location";

vi.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: () => false,
  },
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("browser-location (web)", () => {
  it("isSecureLocationContext follows window.isSecureContext on web", () => {
    vi.stubGlobal("window", { isSecureContext: true });
    expect(isSecureLocationContext()).toBe(true);
    vi.stubGlobal("window", { isSecureContext: false });
    expect(isSecureLocationContext()).toBe(false);
  });

  it("isGeolocationApiAvailable reflects navigator.geolocation", () => {
    vi.stubGlobal("navigator", {});
    expect(isGeolocationApiAvailable()).toBe(false);
    vi.stubGlobal("navigator", { geolocation: {} });
    expect(isGeolocationApiAvailable()).toBe(true);
  });

  it("queryGeolocationPermissionHint returns unknown when Permissions API missing", async () => {
    vi.stubGlobal("navigator", {});
    await expect(queryGeolocationPermissionHint()).resolves.toBe("unknown");
  });

  it("queryGeolocationPermissionHint never invents denied on query failure", async () => {
    vi.stubGlobal("navigator", {
      permissions: {
        query: vi.fn().mockRejectedValue(new Error("not supported")),
      },
    });
    await expect(queryGeolocationPermissionHint()).resolves.toBe("unknown");
  });

  it("detectCurrentLocation rejects insecure context without calling geolocation", async () => {
    const getCurrentPosition = vi.fn();
    vi.stubGlobal("window", { isSecureContext: false });
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition } });
    await expect(detectCurrentLocation()).rejects.toMatchObject({
      kind: "insecure_context",
    });
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("detectCurrentLocation resolves coordinates when granted", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          success: PositionCallback,
          _error?: PositionErrorCallback,
          _opts?: PositionOptions,
        ) => {
          success({
            coords: {
              latitude: 17.385,
              longitude: 78.4867,
              accuracy: 12,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null,
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        },
      },
    });
    await expect(detectCurrentLocation()).resolves.toEqual({
      latitude: 17.385,
      longitude: 78.4867,
      accuracy: 12,
    });
  });

  it("detectCurrentLocation maps PERMISSION_DENIED without claiming Permissions API", async () => {
    vi.stubGlobal("window", { isSecureContext: true });
    class FakeGeoError extends Error {
      code: number;
      PERMISSION_DENIED = 1;
      POSITION_UNAVAILABLE = 2;
      TIMEOUT = 3;
      constructor(code: number) {
        super("denied");
        this.code = code;
      }
    }
    vi.stubGlobal("GeolocationPositionError", FakeGeoError);
    vi.stubGlobal("navigator", {
      geolocation: {
        getCurrentPosition: (
          _success: PositionCallback,
          error?: PositionErrorCallback,
        ) => {
          error?.(new FakeGeoError(1) as unknown as GeolocationPositionError);
        },
      },
    });
    try {
      await detectCurrentLocation();
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AdminLocationError);
      expect((err as AdminLocationError).kind).toBe("permission_denied");
      expect(adminLocationUserMessage(err)).toMatch(/site settings/i);
    }
  });
});
