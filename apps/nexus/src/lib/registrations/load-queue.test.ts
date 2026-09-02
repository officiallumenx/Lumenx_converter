import { beforeEach, describe, expect, it, vi } from "vitest";

describe("loadRegistrationsQueue", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns API registrations in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const dto = {
      id: "11111111-1111-4111-8111-111111111111",
      applicantUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      applicantName: "Applicant",
      email: "principal@school.edu",
      phone: null,
      payload: { instituteName: "Alpha School" },
      status: "pending" as const,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      instituteId: null,
      createdAt: "2024-06-01T08:00:00Z",
      updatedAt: "2024-06-01T08:00:00Z",
    };
    const listRegistrations = vi.fn().mockResolvedValue([dto]);
    const listInstituteRegistrations = vi.fn(() => []);
    vi.doMock("./api", () => ({ listRegistrations }));
    vi.doMock("@lumenx/utils", () => ({
      ensureDemoPendingRegistration: vi.fn(),
      listInstituteRegistrations,
    }));

    const { loadRegistrationsQueue } = await import("./load-queue");
    const result = await loadRegistrationsQueue();

    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.source).toBe("api");
      expect(result.applications).toHaveLength(1);
      expect(result.applications[0]?.payload.instituteName).toBe("Alpha School");
    }
    expect(listRegistrations).toHaveBeenCalledWith("all");
    expect(listInstituteRegistrations).not.toHaveBeenCalled();
  });

  it("does not fall back to demo registrations when the API fails", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const listRegistrations = vi.fn().mockRejectedValue(
      Object.assign(new Error("Service unavailable"), { status: 503 }),
    );
    const listInstituteRegistrations = vi.fn(() => [
      { id: "demo-1", payload: { instituteName: "Demo School" } },
    ]);
    vi.doMock("./api", () => ({ listRegistrations }));
    vi.doMock("@lumenx/utils", () => ({
      ensureDemoPendingRegistration: vi.fn(),
      listInstituteRegistrations,
    }));

    const { loadRegistrationsQueue } = await import("./load-queue");
    const result = await loadRegistrationsQueue();

    expect(result.status).toBe("error");
    expect(listInstituteRegistrations).not.toHaveBeenCalled();
  });

  it("handles unauthorized API responses explicitly", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { ApiClientError } = await import("@/lib/api");
    const listRegistrations = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listRegistrations }));

    const { loadRegistrationsQueue } = await import("./load-queue");
    const result = await loadRegistrationsQueue();

    expect(result).toEqual({
      status: "error",
      message: "Authentication required",
      unauthorized: true,
      forbidden: false,
    });
  });

  it("handles forbidden API responses explicitly", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { ApiClientError } = await import("@/lib/api");
    const listRegistrations = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "Insufficient platform role",
      }),
    );
    vi.doMock("./api", () => ({ listRegistrations }));

    const { loadRegistrationsQueue } = await import("./load-queue");
    const result = await loadRegistrationsQueue();

    expect(result).toEqual({
      status: "error",
      message: "Insufficient platform role",
      unauthorized: false,
      forbidden: true,
    });
  });

  it("keeps demo mode isolated on the local registration store", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "demo");
    const listRegistrations = vi.fn();
    const demoApps = [
      {
        id: "demo-1",
        referenceId: "LX-DEMO-1",
        status: "pending" as const,
        payload: {
          instituteName: "Demo School",
          logoPreview: "",
          instituteType: "School (K-12)",
          educationBoard: "CBSE",
          country: "India",
          state: "Karnataka",
          district: "",
          city: "Bengaluru",
          address: "",
          pincode: "",
          website: "",
          principalName: "Principal",
          principalEmail: "demo@school.edu",
          principalMobile: "",
          principalDesignation: "Principal",
          employeeId: "",
        },
        emailVerified: true,
        mobileVerified: true,
        submittedAt: "2024-06-01T08:00:00Z",
        updatedAt: "2024-06-01T08:00:00Z",
      },
    ];
    vi.doMock("./api", () => ({ listRegistrations }));
    vi.doMock("@lumenx/utils", () => ({
      ensureDemoPendingRegistration: vi.fn(),
      listInstituteRegistrations: () => demoApps,
    }));

    const { loadRegistrationsQueue } = await import("./load-queue");
    const result = await loadRegistrationsQueue();

    expect(listRegistrations).not.toHaveBeenCalled();
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.source).toBe("demo");
      expect(result.applications).toEqual(demoApps);
    }
  });
});
