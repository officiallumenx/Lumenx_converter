import { describe, expect, it } from "vitest";
import { studentDtoToProfile, studentDtoToTeacherDetail } from "./map";
import type { StudentDto, StudentGuardianDto } from "./types";

const dto: StudentDto = {
  id: "ac111111-1111-4111-8111-111111111111",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userProfileId: null,
  legacyCode: null,
  admissionNumber: "ADM-1",
  firstName: "Aarav",
  surname: "Sharma",
  displayName: "Aarav Sharma",
  gender: "male",
  dateOfBirth: "2012-03-01",
  address: "12 Park Lane",
  classLabel: "10",
  sectionLabel: "A",
  rollNo: "14",
  status: "active",
  accessStatus: "active",
  bloodGroup: "O+",
  emergencyContact: "+919999999999",
  house: "Blue",
  photoAssetPath: null,
  idCardIssuedOn: "2026-06-01",
  idCardValidTill: "2027-05-31",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

const guardian: StudentGuardianDto = {
  linkId: "bc111111-1111-4111-8111-111111111111",
  parentId: "ba111111-1111-4111-8111-111111111111",
  parentName: "Priya Sharma",
  phone: "+919888888888",
  email: "priya@example.com",
  relationship: "mother",
  isPrimary: true,
  isEmergencyContact: true,
};

describe("connect students map", () => {
  it("maps dto to teacher detail with guardian contact", () => {
    const detail = studentDtoToTeacherDetail(dto, [guardian]);
    expect(detail.name).toBe("Aarav Sharma");
    expect(detail.className).toBe("10");
    expect(detail.parentName).toBe("Priya Sharma");
    expect(detail.marks).toEqual([]);
    expect(detail.remarks).toEqual([]);
  });

  it("accepts API remarks without inventing seed data", () => {
    const detail = studentDtoToTeacherDetail(dto, [guardian], [
      {
        id: "11111111-1111-4111-8111-111111111111",
        studentId: dto.id,
        studentName: "Aarav Sharma",
        type: "academic",
        text: "Strong progress in algebra this week.",
        authorId: "bb111111-1111-4111-8111-111111111111",
        authorName: "Ms Teacher",
        createdAt: "10 Sep 2026",
        visibleTo: ["teacher", "parent", "admin"],
      },
    ]);
    expect(detail.remarks).toHaveLength(1);
    expect(detail.remarks[0]?.text).toContain("algebra");
  });

  it("maps dto to student portal profile", () => {
    const profile = studentDtoToProfile(dto, { parentName: "Priya Sharma", institute: "Demo School" });
    expect(profile.rollNo).toBe("14");
    expect(profile.idCardValidTill).toBe("2027-05-31");
    expect(profile.parentName).toBe("Priya Sharma");
  });
});
