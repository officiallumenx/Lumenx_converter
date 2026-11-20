import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "11111111-1111-4111-8111-111111111111";
const TEACHER = "22222222-2222-4222-8222-222222222222";
const SECTION = "33333333-3333-4333-8333-333333333333";
const CLASS_ID = "44444444-4444-4444-8444-444444444444";

const listEnrollments = vi.fn();
const listSectionStudentPhotos = vi.fn();

describe("loadTeacherPortalApiData Home shell", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    listEnrollments.mockReset();
    listSectionStudentPhotos.mockReset();
  });

  it(
    "skips enrollments and photos when includeStudents is false",
    async () => {
      vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
      vi.doMock("./api", () => ({
        clearTeacherCatalogCache: vi.fn(),
        fetchMe: vi.fn(async () => ({
          identities: {
            teachers: [{ instituteId: INST, teacherId: TEACHER, status: "active" }],
          },
        })),
        listTeacherAssignments: vi.fn(async () => [
          {
            id: "a1",
            instituteId: INST,
            academicYearId: "y",
            classId: CLASS_ID,
            sectionId: SECTION,
            subjectId: "s1",
            teacherId: TEACHER,
            status: "active",
          },
        ]),
        listSections: vi.fn(async () => [
          {
            id: SECTION,
            instituteId: INST,
            academicYearId: "y",
            classId: CLASS_ID,
            name: "A",
            code: "A",
            capacity: null,
            room: null,
            sortOrder: 0,
            status: "active",
            classTeacherId: null,
            createdAt: "",
            updatedAt: "",
          },
        ]),
        listClasses: vi.fn(async () => [
          {
            id: CLASS_ID,
            instituteId: INST,
            academicYearId: "y",
            name: "10",
            code: "10",
            sortOrder: 0,
            status: "active",
            createdAt: "",
            updatedAt: "",
          },
        ]),
        listSubjects: vi.fn(async () => [
          { id: "s1", instituteId: INST, name: "Math", code: "M", status: "active" },
        ]),
        listEnrollments,
      }));
      vi.doMock("@/lib/teachers/api", () => ({
        getTeacherSelfPortal: vi.fn(async () => ({
          teacherId: TEACHER,
          assignedSectionLabels: [],
          assignments: [],
          teachingScope: "subject_teacher",
          portalAccessLevel: "faculty_grading",
        })),
      }));
      vi.doMock("@/lib/photos/api", () => ({
        listSectionStudentPhotos,
      }));

      const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
      clearTeacherPortalApiCache();
      const data = await loadTeacherPortalApiData(INST, { includeStudents: false });
      expect(data).not.toBeNull();
      expect(data!.studentsLoaded).toBe(false);
      expect(data!.classes.length).toBeGreaterThan(0);
      expect(listEnrollments).not.toHaveBeenCalled();
      expect(listSectionStudentPhotos).not.toHaveBeenCalled();
    },
    15_000,
  );

  it(
    "upgrades shell roster with enrollments without a second portal/me",
    async () => {
      vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
      const getTeacherSelfPortal = vi.fn(async () => ({
        teacherId: TEACHER,
        assignedSectionLabels: [],
        assignments: [],
        teachingScope: "subject_teacher",
        portalAccessLevel: "faculty_grading",
      }));
      listEnrollments.mockResolvedValue([
        {
          id: "e1",
          instituteId: INST,
          academicYearId: "y",
          classId: CLASS_ID,
          sectionId: SECTION,
          studentId: "55555555-5555-4555-8555-555555555555",
          rollNumber: "1",
          status: "active",
          studentName: "Ada",
          studentCode: "S1",
        },
      ]);
      listSectionStudentPhotos.mockResolvedValue([]);
      vi.doMock("./api", () => ({
        clearTeacherCatalogCache: vi.fn(),
        fetchMe: vi.fn(async () => ({
          identities: {
            teachers: [{ instituteId: INST, teacherId: TEACHER, status: "active" }],
          },
        })),
        listTeacherAssignments: vi.fn(async () => [
          {
            id: "a1",
            instituteId: INST,
            academicYearId: "y",
            classId: CLASS_ID,
            sectionId: SECTION,
            subjectId: "s1",
            teacherId: TEACHER,
            status: "active",
          },
        ]),
        listSections: vi.fn(async () => [
          {
            id: SECTION,
            instituteId: INST,
            academicYearId: "y",
            classId: CLASS_ID,
            name: "A",
            code: "A",
            capacity: null,
            room: null,
            sortOrder: 0,
            status: "active",
            classTeacherId: null,
            createdAt: "",
            updatedAt: "",
          },
        ]),
        listClasses: vi.fn(async () => [
          {
            id: CLASS_ID,
            instituteId: INST,
            academicYearId: "y",
            name: "10",
            code: "10",
            sortOrder: 0,
            status: "active",
            createdAt: "",
            updatedAt: "",
          },
        ]),
        listSubjects: vi.fn(async () => [
          { id: "s1", instituteId: INST, name: "Math", code: "M", status: "active" },
        ]),
        listEnrollments,
      }));
      vi.doMock("@/lib/teachers/api", () => ({ getTeacherSelfPortal }));
      vi.doMock("@/lib/photos/api", () => ({ listSectionStudentPhotos }));

      const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
      clearTeacherPortalApiCache();
      await loadTeacherPortalApiData(INST, { includeStudents: false });
      expect(getTeacherSelfPortal).toHaveBeenCalledTimes(1);

      const full = await loadTeacherPortalApiData(INST, { includeStudents: true });
      expect(full!.studentsLoaded).toBe(true);
      expect(full!.allStudents.length).toBeGreaterThan(0);
      expect(getTeacherSelfPortal).toHaveBeenCalledTimes(1);
      expect(listEnrollments).toHaveBeenCalled();
    },
    15_000,
  );
});
