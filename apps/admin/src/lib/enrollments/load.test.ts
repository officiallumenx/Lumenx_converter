import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import {
  resolveEnrollmentsListView,
  shouldCommitEnrollmentsLoad,
} from "./list-view";

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("loadEnrollmentsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listEnrollments = vi.fn();
    vi.doMock("./api", () => ({ listEnrollments }));
    const { loadEnrollmentsList } = await import("./load");
    const result = await loadEnrollmentsList(INST_A, { sectionId: INST_A });
    expect(result.status).toBe("demo");
    expect(result.items).toEqual([]);
    expect(listEnrollments).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEnrollments = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listEnrollments }));
    const { loadEnrollmentsList } = await import("./load");
    const result = await loadEnrollmentsList(INST_A, {});
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("loads real enrollment roster in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEnrollments = vi.fn().mockResolvedValue([
      {
        id: "e1111111-1111-4111-8111-111111111111",
        instituteId: INST_A,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        studentId: "ac111111-1111-4111-8111-111111111111",
        studentName: "Ada Lovelace",
        classId: "cd111111-1111-4111-8111-111111111111",
        sectionId: "ce111111-1111-4111-8111-111111111111",
        rollNo: "1",
        status: "active",
        enrolledOn: "2026-04-01",
        withdrawnOn: null,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ]);
    vi.doMock("./api", () => ({ listEnrollments }));
    const { loadEnrollmentsList } = await import("./load");
    const result = await loadEnrollmentsList(INST_A, {
      sectionId: "ce111111-1111-4111-8111-111111111111",
      status: "active",
    });
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.studentName).toBe("Ada Lovelace");
    expect(listEnrollments).toHaveBeenCalledWith(
      expect.objectContaining({
        instituteId: INST_A,
        sectionId: "ce111111-1111-4111-8111-111111111111",
        status: "active",
      }),
    );
  });
});

describe("enrollments list-view institute isolation", () => {
  it("hides institute A roster when active institute is B", () => {
    const view = resolveEnrollmentsListView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST_B,
      resolvedForInstituteId: INST_A,
      storedItems: [
        {
          id: "e1",
          studentId: "s1",
          studentName: "Stale A",
          classId: "c1",
          sectionId: "sec1",
          academicYearId: "y1",
          rollNo: "1",
          status: "active",
        },
      ],
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.rowsValid).toBe(false);
    expect(view.items).toEqual([]);
    expect(view.status).toBe("loading");
  });

  it("does not commit stale enrollment load after institute switch", () => {
    expect(
      shouldCommitEnrollmentsLoad({
        cancelled: false,
        requestInstituteId: INST_A,
        activeInstituteId: INST_B,
        requestKey: `${INST_A}|sec`,
        activeKey: `${INST_B}|sec`,
      }),
    ).toBe(false);
  });
});
