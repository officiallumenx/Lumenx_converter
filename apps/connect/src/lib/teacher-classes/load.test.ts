import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { assignmentsToTeacherClasses } from "./map";
import type {
  ClassDto,
  EnrollmentDto,
  SectionDto,
  SubjectDto,
  TeacherAssignmentDto,
} from "./api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECTION = "ss111111-1111-4111-8111-111111111111";
const CLASS_ID = "cc111111-1111-4111-8111-111111111111";
const TEACHER = "tt111111-1111-4111-8111-111111111111";
const SUBJECT = "su111111-1111-4111-8111-111111111111";

const section: SectionDto = {
  id: SECTION,
  instituteId: INST,
  academicYearId: "y",
  classId: CLASS_ID,
  name: "A",
  code: "A",
  capacity: 40,
  room: null,
  sortOrder: 1,
  status: "active",
  classTeacherId: TEACHER,
  createdAt: "",
  updatedAt: "",
};

const klass: ClassDto = {
  id: CLASS_ID,
  instituteId: INST,
  academicYearId: "y",
  name: "Grade 10",
  code: "G10",
  sortOrder: 1,
  status: "active",
  createdAt: "",
  updatedAt: "",
};

describe("teacher-classes map — class teacher", () => {
  it("sets isClassTeacher from section.classTeacherId without requiring subjects", () => {
    const assignments: TeacherAssignmentDto[] = [
      {
        id: "a1",
        instituteId: INST,
        academicYearId: "y",
        classId: CLASS_ID,
        sectionId: SECTION,
        subjectId: SUBJECT,
        teacherId: TEACHER,
        status: "active",
      },
    ];
    const subjects: SubjectDto[] = [
      {
        id: SUBJECT,
        instituteId: INST,
        name: "Mathematics",
        code: "MATH",
        status: "active",
      },
    ];
    const enrollments: EnrollmentDto[] = [];

    const teacherClasses = assignmentsToTeacherClasses(
      assignments,
      [section],
      [klass],
      enrollments,
      subjects,
      TEACHER,
    );
    expect(teacherClasses).toHaveLength(1);
    expect(teacherClasses[0]?.isClassTeacher).toBe(true);
  });

  it("does not mark subject teacher as class teacher when classTeacherId differs", () => {
    const otherTeacher = "tt222222-2222-4222-8222-222222222222";
    const assignments: TeacherAssignmentDto[] = [
      {
        id: "a1",
        instituteId: INST,
        academicYearId: "y",
        classId: CLASS_ID,
        sectionId: SECTION,
        subjectId: SUBJECT,
        teacherId: otherTeacher,
        status: "active",
      },
    ];
    const subjects: SubjectDto[] = [
      {
        id: SUBJECT,
        instituteId: INST,
        name: "Mathematics",
        code: "MATH",
        status: "active",
      },
    ];

    const teacherClasses = assignmentsToTeacherClasses(
      assignments,
      [{ ...section, classTeacherId: TEACHER }],
      [klass],
      [],
      subjects,
      otherTeacher,
    );
    expect(teacherClasses[0]?.isClassTeacher).toBe(false);
  });
});

describe("loadTeacherPortalApiData — class-teacher-only sections", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("includes sections where teacher is class teacher with zero subject assignments", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      fetchMe: vi.fn(async () => ({
        identities: {
          teachers: [{ instituteId: INST, teacherId: TEACHER }],
        },
      })),
      listTeacherAssignments: vi.fn(async () => []),
      listSections: vi.fn(async () => [section]),
      listClasses: vi.fn(async () => [klass]),
      listSubjects: vi.fn(async () => []),
      listEnrollments: vi.fn(async () => []),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      getTeacherSelfPortal: vi.fn(async () => ({
        teacherId: TEACHER,
        assignedSectionLabels: [],
        assignments: [],
      })),
    }));

    const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
    clearTeacherPortalApiCache();
    const data = await loadTeacherPortalApiData(INST);
    expect(data).not.toBeNull();
    expect(data!.teacherId).toBe(TEACHER);
    expect(data!.classes).toHaveLength(1);
    expect(data!.classes[0]?.id).toBe(SECTION);
    expect(data!.classes[0]?.isClassTeacher).toBe(true);
    expect(data!.classes[0]?.subject).toBe("Class teacher");
  });

  it("matches assigned_section_labels when graph links are missing", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      fetchMe: vi.fn(async () => ({
        identities: {
          teachers: [{ instituteId: INST, teacherId: TEACHER }],
        },
      })),
      listTeacherAssignments: vi.fn(async () => []),
      listSections: vi.fn(async () => [{ ...section, classTeacherId: null }]),
      listClasses: vi.fn(async () => [klass]),
      listSubjects: vi.fn(async () => []),
      listEnrollments: vi.fn(async () => [
        {
          id: "e1",
          instituteId: INST,
          academicYearId: "y",
          studentId: "st1",
          studentName: "Ada",
          classId: CLASS_ID,
          sectionId: SECTION,
          rollNo: "1",
          status: "active",
          enrolledOn: "2026-01-01",
          withdrawnOn: null,
          createdAt: "",
          updatedAt: "",
        },
      ]),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      getTeacherSelfPortal: vi.fn(async () => ({
        teacherId: TEACHER,
        assignedSectionLabels: ["G10-A"],
        assignments: [],
      })),
    }));

    const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
    clearTeacherPortalApiCache();
    const data = await loadTeacherPortalApiData(INST);
    expect(data!.classes).toHaveLength(1);
    expect(data!.classes[0]?.id).toBe(SECTION);
    expect(data!.allStudents).toHaveLength(1);
    expect(data!.allStudents[0]?.name).toBe("Ada");
  });

  it("returns null without inventing demo classes when teacher identity is missing", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      fetchMe: vi.fn(async () => ({
        identities: { teachers: [] },
      })),
      listTeacherAssignments: vi.fn(),
      listSections: vi.fn(),
      listClasses: vi.fn(),
      listSubjects: vi.fn(),
      listEnrollments: vi.fn(),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      getTeacherSelfPortal: vi.fn(),
    }));

    const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
    clearTeacherPortalApiCache();
    const data = await loadTeacherPortalApiData(INST);
    expect(data).toBeNull();
  });

  it("keeps portal/me class-teacher sections when section catalog returns empty", async () => {
    vi.stubEnv("VITE_CONNECT_AUTH_MODE", "api");
    vi.doMock("./api", () => ({
      fetchMe: vi.fn(async () => ({
        identities: {
          teachers: [{ instituteId: INST, teacherId: TEACHER, status: "active" }],
        },
      })),
      listTeacherAssignments: vi.fn(async () => []),
      listSections: vi.fn(async () => []),
      listClasses: vi.fn(async () => []),
      listSubjects: vi.fn(async () => []),
      listEnrollments: vi.fn(async () => []),
    }));
    vi.doMock("@/lib/teachers/api", () => ({
      getTeacherSelfPortal: vi.fn(async () => ({
        teacherId: TEACHER,
        assignedSectionLabels: [],
        assignments: [
          {
            sectionId: SECTION,
            classLabel: "Grade 10",
            sectionLabel: "A",
            subjects: ["Class teacher"],
          },
        ],
      })),
    }));

    const { loadTeacherPortalApiData, clearTeacherPortalApiCache } = await import("./load");
    clearTeacherPortalApiCache();
    const data = await loadTeacherPortalApiData(INST);
    expect(data!.classes).toHaveLength(1);
    expect(data!.classes[0]?.id).toBe(SECTION);
    expect(data!.classes[0]?.isClassTeacher).toBe(true);
  });
});
