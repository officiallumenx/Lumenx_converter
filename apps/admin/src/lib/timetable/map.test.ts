import { describe, expect, it } from "vitest";
import { buildTimetableReadBundle, teacherAssignmentDtoToListItem } from "./map";
import type { TeacherAssignmentDto, TimetableSlotDto } from "./types";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type { SubjectDto } from "@/lib/subjects/types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("timetable map", () => {
  it("builds section summaries from slot rows", () => {
    const classId = "dd111111-1111-4111-8111-111111111111";
    const sectionId = "ff111111-1111-4111-8111-111111111111";
    const classes: ClassDto[] = [
      {
        id: classId,
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        name: "Grade 10",
        code: "G10",
        sortOrder: 1,
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    const sections: SectionDto[] = [
      {
        id: sectionId,
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId,
        name: "A",
        code: "A",
        capacity: 40,
        room: "101",
        sortOrder: 1,
        status: "active",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];
    const rows: TimetableSlotDto[] = [
      {
        id: "ee111111-1111-4111-8111-111111111111",
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId,
        sectionId,
        teacherAssignmentId: "aa111111-1111-4111-8111-111111111111",
        dayOfWeek: 1,
        periodIndex: 1,
        startsAt: "09:00:00",
        endsAt: "09:45:00",
        room: "101",
        status: "active",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
      {
        id: "ee222222-2222-4222-8222-222222222222",
        instituteId: INST,
        academicYearId: "cc111111-1111-4111-8111-111111111111",
        classId,
        sectionId,
        teacherAssignmentId: "aa111111-1111-4111-8111-111111111111",
        dayOfWeek: 2,
        periodIndex: 2,
        startsAt: "10:00:00",
        endsAt: "10:45:00",
        room: "102",
        status: "inactive",
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
    const bundle = buildTimetableReadBundle(rows, sections, classes);
    expect(bundle.sections).toHaveLength(1);
    expect(bundle.sections[0]?.slotCount).toBe(2);
    expect(bundle.sections[0]?.activeCount).toBe(1);
    expect(bundle.sections[0]?.inactiveCount).toBe(1);
    expect(bundle.sections[0]?.publishStatus).toBe("draft");
    expect(bundle.slots[0]?.classLabel).toBe("Grade 10");
    expect(bundle.slots[0]?.dayLabel).toBe("Mon");
  });

  it("labels teacher assignments with subject and teacher names", () => {
    const dto: TeacherAssignmentDto = {
      id: "aa111111-1111-4111-8111-111111111111",
      instituteId: INST,
      academicYearId: "cc111111-1111-4111-8111-111111111111",
      classId: "dd111111-1111-4111-8111-111111111111",
      sectionId: "ff111111-1111-4111-8111-111111111111",
      subjectId: "bb111111-1111-4111-8111-111111111111",
      teacherId: "ee111111-1111-4111-8111-111111111111",
      status: "active",
    };
    const teachers = new Map<string, TeacherListItem>([
      [dto.teacherId, { id: dto.teacherId, name: "Ada Teacher" } as TeacherListItem],
    ]);
    const subjects = new Map<string, SubjectDto>([
      [
        dto.subjectId,
        {
          id: dto.subjectId,
          instituteId: INST,
          name: "Mathematics",
          code: "MATH",
          category: "core",
          periodsPerWeek: 5,
          applicableClassCodes: [],
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ],
    ]);
    expect(teacherAssignmentDtoToListItem(dto, teachers, subjects).label).toBe(
      "Mathematics · Ada Teacher",
    );
  });
});
