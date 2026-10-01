import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("setup checklist load", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.doMock("@/auth/auth-mode", () => ({
      isApiAuthMode: () => true,
      isDemoAuthMode: () => false,
    }));
    vi.doMock("@/lib/admin-resource-cache", () => ({
      adminCacheKey: (entity: string, id: string) => `admin:${entity}:${id}`,
      cachedAdminFetch: (_key: string, fn: () => Promise<unknown>) => fn(),
      invalidateAdminCache: vi.fn(),
      peekAdminCacheSoft: () => null,
    }));
  });

  it("persists and clears verified core-complete snapshots", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      get length() {
        return store.size;
      },
      key: (i: number) => [...store.keys()][i] ?? null,
    });

    const {
      readVerifiedSetupCoreComplete,
      writeVerifiedSetupCoreComplete,
      clearVerifiedSetupCoreComplete,
    } = await import("./load");

    expect(readVerifiedSetupCoreComplete(INST)).toBe(false);
    writeVerifiedSetupCoreComplete(INST, true);
    expect(readVerifiedSetupCoreComplete(INST)).toBe(true);
    writeVerifiedSetupCoreComplete(INST, false);
    expect(readVerifiedSetupCoreComplete(INST)).toBe(false);
    writeVerifiedSetupCoreComplete(INST, true);
    clearVerifiedSetupCoreComplete(INST);
    expect(readVerifiedSetupCoreComplete(INST)).toBe(false);
  });

  it("returns error (not ready+incomplete) when a core list API rejects", async () => {
    vi.doMock("@/lib/academic-years/api", () => ({
      listAcademicYears: vi.fn().mockResolvedValue([{ status: "active" }]),
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi
        .fn()
        .mockResolvedValue({ classes: [{ id: "c1" }], sections: [{ id: "s1" }] }),
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([{ id: "sub1" }]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockRejectedValue(new Error("teachers down")),
    }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([{ id: "stu1", userProfileId: "u1" }]),
    }));
    vi.doMock("@/lib/parents/api", () => ({
      listParents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/parents/map", () => ({
      parentDtosToListItems: () => [],
    }));
    vi.doMock("@/lib/attendance/api", () => ({
      listAttendanceConfig: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/fees/api", () => ({
      listFeePlans: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/calendar/api", () => ({
      listCalendarEvents: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/transport/api", () => ({
      listTransportVehicles: vi.fn().mockResolvedValue([]),
      listTransportDrivers: vi.fn().mockResolvedValue([]),
      listTransportRoutes: vi.fn().mockResolvedValue([]),
      listTransportEnrollments: vi.fn().mockResolvedValue([]),
    }));

    const { loadSetupChecklist } = await import("./load");
    const result = await loadSetupChecklist(INST, { force: true });
    expect(result.status).toBe("error");
    expect(result.coreComplete).toBe(false);
    expect(result.errorMessage).toMatch(/teachers/i);
  });

  it("still ready when only extended sources fail", async () => {
    vi.doMock("@/lib/academic-years/api", () => ({
      listAcademicYears: vi.fn().mockResolvedValue([{ status: "active" }]),
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClassesCatalog: vi
        .fn()
        .mockResolvedValue({ classes: [{ id: "c1" }], sections: [{ id: "s1" }] }),
    }));
    vi.doMock("@/lib/subjects/api", () => ({
      listSubjects: vi.fn().mockResolvedValue([{ id: "sub1" }]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi
        .fn()
        .mockResolvedValue([{ id: "t1", userProfileId: "u1" }]),
    }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi
        .fn()
        .mockResolvedValue([{ id: "stu1", userProfileId: "u1" }]),
    }));
    vi.doMock("@/lib/parents/api", () => ({
      listParents: vi.fn().mockResolvedValue([{ id: "p1" }]),
    }));
    vi.doMock("@/lib/parents/map", () => ({
      parentDtosToListItems: () => [{ linkedStudentIds: ["stu1"] }],
    }));
    vi.doMock("@/lib/attendance/api", () => ({
      listAttendanceConfig: vi.fn().mockRejectedValue(new Error("attendance down")),
    }));
    vi.doMock("@/lib/fees/api", () => ({
      listFeePlans: vi.fn().mockRejectedValue(new Error("fees down")),
    }));
    vi.doMock("@/lib/calendar/api", () => ({
      listCalendarEvents: vi.fn().mockRejectedValue(new Error("calendar down")),
    }));
    vi.doMock("@/lib/transport/api", () => ({
      listTransportVehicles: vi.fn().mockRejectedValue(new Error("vehicles down")),
      listTransportDrivers: vi.fn().mockRejectedValue(new Error("drivers down")),
      listTransportRoutes: vi.fn().mockRejectedValue(new Error("routes down")),
      listTransportEnrollments: vi
        .fn()
        .mockRejectedValue(new Error("enrollments down")),
    }));

    const { loadSetupChecklist } = await import("./load");
    const result = await loadSetupChecklist(INST, { force: true });
    expect(result.status).toBe("ready");
    expect(result.errorMessage).toBeNull();
  });
});
