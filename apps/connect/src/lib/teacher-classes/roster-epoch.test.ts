import { beforeEach, describe, expect, it, vi } from "vitest";

const INST_A = "11111111-1111-4111-8111-111111111111";
const INST_B = "22222222-2222-4222-8222-222222222222";
const TEACHER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("teacher roster module cache epoch", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it(
    "does not publish institute A after a switch bumps the epoch mid-flight",
    async () => {
      vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");

      let resolveAssignments!: (v: unknown) => void;
      const assignmentsGate = new Promise((resolve) => {
        resolveAssignments = resolve;
      });

      vi.doMock("./api", () => ({
        clearTeacherCatalogCache: vi.fn(),
        fetchMe: vi.fn(async () => ({
          identities: {
            teachers: [
              { instituteId: INST_A, teacherId: TEACHER_A, status: "active" },
              { instituteId: INST_B, teacherId: TEACHER_B, status: "active" },
            ],
          },
        })),
        listTeacherAssignments: vi.fn(async (params: { instituteId: string }) => {
          if (params.instituteId === INST_A) {
            await assignmentsGate;
            return [
              {
                id: "a1",
                instituteId: INST_A,
                academicYearId: "y",
                classId: "c1",
                sectionId: "s1",
                subjectId: "sub",
                teacherId: TEACHER_A,
                status: "active",
              },
            ];
          }
          return [
            {
              id: "b1",
              instituteId: INST_B,
              academicYearId: "y",
              classId: "c2",
              sectionId: "s2",
              subjectId: "sub",
              teacherId: TEACHER_B,
              status: "active",
            },
          ];
        }),
        listSections: vi.fn(async () => []),
        listClasses: vi.fn(async () => []),
        listSubjects: vi.fn(async () => []),
        listEnrollments: vi.fn(async () => []),
      }));
      vi.doMock("@/lib/teachers/api", () => ({
        getTeacherSelfPortal: vi.fn(async (params: { instituteId: string }) => ({
          teacherId: params.instituteId === INST_A ? TEACHER_A : TEACHER_B,
          assignedSectionLabels: [],
          assignments: [],
          teachingScope: "subject_teacher",
          portalAccessLevel: "faculty_grading",
        })),
      }));
      vi.doMock("@/lib/photos/api", () => ({
        listSectionStudentPhotos: vi.fn(async () => []),
      }));

      const {
        loadTeacherPortalApiData,
        clearTeacherPortalApiCache,
        bumpTeacherPortalRosterEpoch,
        getTeacherPortalApiCache,
      } = await import("./load");
      clearTeacherPortalApiCache();

      const loadA = loadTeacherPortalApiData(INST_A, { includeStudents: false });
      // Switch institutes while A is still waiting on assignments.
      bumpTeacherPortalRosterEpoch();
      const loadB = await loadTeacherPortalApiData(INST_B, { includeStudents: false });
      resolveAssignments([]);
      const resultA = await loadA;

      expect(resultA?.instituteId).toBe(INST_A);
      expect(loadB?.instituteId).toBe(INST_B);
      // Module cache must reflect B (or null), never A after the switch.
      const published = getTeacherPortalApiCache();
      expect(published?.instituteId).not.toBe(INST_A);
      expect(published?.instituteId).toBe(INST_B);
    },
    20_000,
  );
});
