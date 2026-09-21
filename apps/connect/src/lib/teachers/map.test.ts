import { describe, expect, it } from "vitest";
import {
  buildTeacherDashboardFromApi,
  facultyMemberToCard,
  portalTeacherSelfToProfile,
} from "./map";

describe("connect teachers map", () => {
  it("maps faculty member to learner card", () => {
    const card = facultyMemberToCard({
      id: "bb111111-1111-4111-8111-111111111111",
      displayName: "Ananya Iyer",
      department: "Mathematics",
      qualification: "M.Sc Mathematics",
      subjects: ["Mathematics", "Algebra"],
      isClassTeacher: true,
      phone: null,
      email: "ananya@school.edu",
      status: "active",
      photoAssetPath: "inst/teachers/ananya.jpg",
      photoSignedUrl: "https://signed.example/ananya.jpg",
    });
    expect(card.name).toBe("Ananya Iyer");
    expect(card.subject).toBe("Mathematics, Algebra");
    expect(card.isClassTeacher).toBe(true);
    expect(card.initials).toBe("AI");
    expect(card.phone).toBeUndefined();
    expect(card.photoUrl).toBe("https://signed.example/ananya.jpg");
  });

  it("maps teacher self portal dto to profile", () => {
    const profile = portalTeacherSelfToProfile({
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      teacherId: "bb111111-1111-4111-8111-111111111111",
      displayName: "Ananya Iyer",
      employeeId: "EMP-1042",
      legacyCode: null,
      email: "ananya@school.edu",
      phone: "9000000001",
      department: "Mathematics",
      qualification: "M.Sc Mathematics",
      teachingScope: "subject_teacher",
      portalAccessLevel: "faculty_grading",
      status: "active",
      subjects: ["Mathematics"],
      assignedSectionLabels: ["10-A"],
      joinedOn: "2019-08-01",
      photoAssetPath: null,
      photoSignedUrl: null,
      assignments: [
        {
          sectionId: "cc111111-1111-4111-8111-111111111111",
          classLabel: "10",
          sectionLabel: "A",
          subjects: ["Mathematics"],
        },
      ],
    });
    expect(profile.name).toBe("Ananya Iyer");
    expect(profile.classes).toEqual(["10-A"]);
    expect(profile.subjects).toContain("Mathematics");
    expect(profile.avatar).toBeUndefined();
  });

  it("attaches signed photo url to teacher profile avatar", () => {
    const profile = portalTeacherSelfToProfile(
      {
        instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        teacherId: "bb111111-1111-4111-8111-111111111111",
        displayName: "Ananya Iyer",
        employeeId: "EMP-1042",
        legacyCode: null,
        email: "ananya@school.edu",
        phone: "9000000001",
        department: "Mathematics",
        qualification: "M.Sc Mathematics",
        teachingScope: "subject_teacher",
        portalAccessLevel: "faculty_grading",
        status: "active",
        subjects: ["Mathematics"],
        assignedSectionLabels: ["10-A"],
        joinedOn: "2019-08-01",
        photoAssetPath: "inst/asset/photo.jpg",
        photoSignedUrl: null,
        assignments: [],
      },
      "https://signed.example/photo.jpg",
    );
    expect(profile.avatar).toBe("https://signed.example/photo.jpg");
  });

  it("uses portal photoSignedUrl when no override is passed", () => {
    const profile = portalTeacherSelfToProfile({
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      teacherId: "bb111111-1111-4111-8111-111111111111",
      displayName: "Ananya Iyer",
      employeeId: "EMP-1042",
      legacyCode: null,
      email: "ananya@school.edu",
      phone: "9000000001",
      department: "Mathematics",
      qualification: "M.Sc Mathematics",
      teachingScope: "subject_teacher",
      portalAccessLevel: "faculty_grading",
      status: "active",
      subjects: ["Mathematics"],
      assignedSectionLabels: ["10-A"],
      joinedOn: "2019-08-01",
      photoAssetPath: "inst/asset/photo.jpg",
      photoSignedUrl: "https://signed.example/from-portal.jpg",
      assignments: [],
    });
    expect(profile.avatar).toBe("https://signed.example/from-portal.jpg");
  });

  it("builds empty KPI dashboard from timetable and classes", () => {
    const dashboard = buildTeacherDashboardFromApi({
      todayName: "Monday",
      schedule: {
        Monday: [{ time: "09:00–09:45", subject: "Mathematics", teacher: "Ananya Iyer" }],
        Tuesday: [{ time: "10:00–10:45", subject: "Physics", teacher: "Ananya Iyer" }],
      },
      classes: [
        {
          id: "sec-1",
          className: "10",
          section: "A",
          subject: "Mathematics",
          studentCount: 30,
          isClassTeacher: false,
          attendanceRate: 0,
          homeworkSubmissionRate: 0,
          avgScore: 0,
        },
      ],
    });
    expect(dashboard.todayClasses).toHaveLength(1);
    expect(dashboard.weekClassCount).toBe(2);
    expect(dashboard.pendingHomework).toEqual([]);
    expect(dashboard.classPerformance).toHaveLength(1);
  });
});
