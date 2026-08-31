import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "cc111111-1111-4111-8111-111111111111";
const CLASS = "cd111111-1111-4111-8111-111111111111";
const SECTION = "ce111111-1111-4111-8111-111111111111";
const STUDENT = "ac111111-1111-4111-8111-111111111111";
const ENROLL = "e1111111-1111-4111-8111-111111111111";

describe("enrollments mutations", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("creates enrollment via POST", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { createEnrollmentRecord } = await import("./mutations");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () =>
        JSON.stringify({
          data: {
            id: ENROLL,
            instituteId: INST,
            academicYearId: YEAR,
            studentId: STUDENT,
            studentName: "Ada",
            classId: CLASS,
            sectionId: SECTION,
            rollNo: "5",
            status: "active",
            enrolledOn: "2026-04-01",
            withdrawnOn: null,
            createdAt: "",
            updatedAt: "",
          },
        }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await createEnrollmentRecord(
      {
        instituteId: INST,
        academicYearId: YEAR,
        studentId: STUDENT,
        classId: CLASS,
        sectionId: SECTION,
        rollNo: "5",
        enrolledOn: "2026-04-01",
      },
      client,
    );
    expect(result.rollNo).toBe("5");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/enrollments"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("updates enrollment via PATCH", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { updateEnrollmentRecord } = await import("./mutations");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: {
            id: ENROLL,
            instituteId: INST,
            academicYearId: YEAR,
            studentId: STUDENT,
            studentName: "Ada",
            classId: CLASS,
            sectionId: SECTION,
            rollNo: "9",
            status: "transferred",
            enrolledOn: "2026-04-01",
            withdrawnOn: "2026-06-01",
            createdAt: "",
            updatedAt: "",
          },
        }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await updateEnrollmentRecord(
      ENROLL,
      { rollNo: "9", status: "transferred" },
      client,
    );
    expect(result.status).toBe("transferred");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(`/api/v1/enrollments/${ENROLL}`),
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
