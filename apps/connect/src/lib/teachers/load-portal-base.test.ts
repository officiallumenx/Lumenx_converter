import { beforeEach, describe, expect, it, vi } from "vitest";

const getTeacherSelfPortal = vi.fn();
const loadTeacherTimetable = vi.fn();
const enrichTeacherDashboardSnapshot = vi.fn();

vi.mock("./api", () => ({
  getTeacherSelfPortal: (...args: unknown[]) => getTeacherSelfPortal(...args),
  getLearnerFacultyPortal: vi.fn(),
}));

const getTeacherPortalApiCache = vi.fn((): unknown => null);

vi.mock("@/lib/teacher-classes/load", () => ({
  getTeacherPortalApiCache: () => getTeacherPortalApiCache(),
}));

vi.mock("@/lib/timetable/load", () => ({
  loadTeacherTimetable: (...args: unknown[]) => loadTeacherTimetable(...args),
}));

vi.mock("@/lib/dashboard", () => ({
  enrichTeacherDashboardSnapshot: (...args: unknown[]) =>
    enrichTeacherDashboardSnapshot(...args),
}));

vi.mock("@/lib/photos/api", () => ({
  getPhotoSignedUrl: vi.fn(),
}));

describe("loadTeacherPortalBase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTeacherPortalApiCache.mockReturnValue(null);
    getTeacherSelfPortal.mockResolvedValue({
      instituteId: "11111111-1111-4111-8111-111111111111",
      teacherId: "22222222-2222-4222-8222-222222222222",
      displayName: "T",
      employeeId: "E1",
      legacyCode: null,
      email: null,
      phone: null,
      department: "Math",
      qualification: null,
      teachingScope: "subject_teacher",
      portalAccessLevel: "faculty_grading",
      status: "active",
      subjects: [],
      assignedSectionLabels: [],
      joinedOn: null,
      photoSignedUrl: null,
      photoAssetPath: null,
      assignments: [],
    });
    loadTeacherTimetable.mockResolvedValue({
      schedule: {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
        Saturday: [],
        Sunday: [],
      },
      status: "ready",
    });
  });

  it(
    "returns profile + base dashboard without waiting on enrichment",
    async () => {
      enrichTeacherDashboardSnapshot.mockImplementation(
        () => new Promise(() => {}),
      );
      const { loadTeacherPortalBase } = await import("./load");
      const result = await loadTeacherPortalBase({
        instituteId: "11111111-1111-4111-8111-111111111111",
        classes: [],
      });
      expect(result.teacherId).toBe("22222222-2222-4222-8222-222222222222");
      expect(result.profile).toBeTruthy();
      expect(result.dashboard).toBeTruthy();
      expect(enrichTeacherDashboardSnapshot).not.toHaveBeenCalled();
      expect(getTeacherSelfPortal).toHaveBeenCalled();
    },
    20_000,
  );

  it(
    "reuses roster portalSelf instead of calling portal/me",
    async () => {
      const portalSelf = {
        instituteId: "11111111-1111-4111-8111-111111111111",
        teacherId: "22222222-2222-4222-8222-222222222222",
        displayName: "T",
        employeeId: "E1",
        legacyCode: null,
        email: null,
        phone: null,
        department: "Math",
        qualification: null,
        teachingScope: "subject_teacher" as const,
        portalAccessLevel: "faculty_grading" as const,
        status: "active" as const,
        subjects: [],
        assignedSectionLabels: [],
        joinedOn: null,
        photoSignedUrl: null,
        photoAssetPath: null,
        assignments: [],
      };
      getTeacherPortalApiCache.mockReturnValue({
        instituteId: portalSelf.instituteId,
        teacherId: portalSelf.teacherId,
        portalSelf,
        classes: [],
        studentsBySection: new Map(),
        allStudents: [],
        studentsLoaded: false,
      });
      const { loadTeacherPortalBase } = await import("./load");
      const result = await loadTeacherPortalBase({
        instituteId: portalSelf.instituteId,
        classes: [],
      });
      expect(result.teacherId).toBe(portalSelf.teacherId);
      expect(getTeacherSelfPortal).not.toHaveBeenCalled();
    },
    20_000,
  );

  it(
    "reuses a preloaded timetable schedule without refetching",
    async () => {
      loadTeacherTimetable.mockClear();
      const { loadTeacherPortalBase } = await import("./load");
      await loadTeacherPortalBase({
        instituteId: "11111111-1111-4111-8111-111111111111",
        classes: [],
        schedule: {
          Monday: [{ time: "09:00", subject: "Math", teacher: "T" }],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: [],
        },
      });
      expect(loadTeacherTimetable).not.toHaveBeenCalled();
    },
    20_000,
  );
});
