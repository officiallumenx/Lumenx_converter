import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

const getMock = vi.fn();
vi.mock("@/lib/connect-api", () => ({
  getConnectApiClient: () => ({ get: getMock }),
}));

const getStudent = vi.fn();
const getStudentGuardians = vi.fn();
vi.mock("./api", () => ({
  getStudent: (...args: unknown[]) => getStudent(...args),
  getStudentGuardians: (...args: unknown[]) => getStudentGuardians(...args),
  listStudents: vi.fn(),
}));

vi.mock("@/lib/photos/api", () => ({
  getPhotoSignedUrl: vi.fn(async () => ({ photoSignedUrl: null })),
}));

vi.mock("@/lib/institute-profile/api", () => ({
  getInstitute: vi.fn(async () => ({ name: "E2E Institute" })),
}));

vi.mock("@/lib/academic-history/load-enrollments", () => ({
  loadStudentEnrollmentHistory: vi.fn(async () => ({ status: "ready", rows: [] })),
}));

vi.mock("@/lib/dashboard", () => ({
  enrichStudentDashboardSnapshot: vi.fn(async () => {
    throw new Error("enrich must not run for base");
  }),
}));

describe("loadStudentPortalBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMock.mockResolvedValue({
      profile: { email: "ada@example.com" },
      identities: {
        students: [
          {
            instituteId: "11111111-1111-4111-8111-111111111111",
            studentId: "22222222-2222-4222-8222-222222222222",
          },
        ],
      },
    });
    getStudent.mockResolvedValue({
      id: "22222222-2222-4222-8222-222222222222",
      instituteId: "11111111-1111-4111-8111-111111111111",
      fullName: "Ada Student",
      className: "10",
      section: "A",
      rollNo: "12",
      attendancePct: 96,
      avgScore: 88,
    });
    getStudentGuardians.mockResolvedValue([]);
  });

  it("returns a profile shell snapshot without enrichment widgets", async () => {
    const { loadStudentPortalBase } = await import("./load");
    const { enrichStudentDashboardSnapshot } = await import("@/lib/dashboard");
    const result = await loadStudentPortalBase({
      instituteId: "11111111-1111-4111-8111-111111111111",
      userDisplayName: "Ada Student",
    });
    expect(result.status).toBe("ready");
    expect(result.snapshot?.profile.name).toBe("Ada Student");
    expect(result.snapshot?.performance).toEqual([]);
    expect(result.snapshot?.exams).toEqual([]);
    expect(result.snapshot?.schoolEvents).toEqual([]);
    expect(result.snapshot?.notifications).toEqual([]);
    expect(enrichStudentDashboardSnapshot).not.toHaveBeenCalled();
  });
});
