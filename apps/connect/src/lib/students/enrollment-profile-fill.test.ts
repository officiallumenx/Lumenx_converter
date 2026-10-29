import { describe, expect, it, vi } from "vitest";
import type { StudentProfile } from "@/lib/student/types";

const loadStudentEnrollmentHistory = vi.fn();

vi.mock("@/lib/academic-history/load-enrollments", () => ({
  loadStudentEnrollmentHistory: (...args: unknown[]) =>
    loadStudentEnrollmentHistory(...args),
}));

describe("fillProfileFromActiveEnrollment", () => {
  it(
    "fills blank class/section/roll from active enrollment without inventing values",
    async () => {
    loadStudentEnrollmentHistory.mockResolvedValue({
      status: "ready",
      rows: [
        {
          id: "enr-1",
          yearLabel: "E2E AY",
          classLabel: "E2E Class 1",
          sectionLabel: "A",
          rollNo: "E2E-01",
          status: "active",
          enrolledOn: "2026-04-01",
          withdrawnOn: null,
        },
      ],
    });

    const { fillProfileFromActiveEnrollment } = await import("./load");
    const profile = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Smoke",
      class: "—",
      section: "—",
      rollNo: "—",
      attendance: 0,
      bloodGroup: "—",
      emergencyContact: "—",
      parentName: "—",
      house: "—",
      idCardIssuedOn: "—",
      idCardValidTill: "—",
      email: "",
      bio: "",
      classTeacher: "",
      institute: "Institute",
      address: "—",
      admissionNumber: null,
      legacyCode: null,
      photoAssetPath: null,
      photoUrl: null,
    } satisfies StudentProfile;

    await fillProfileFromActiveEnrollment(
      profile,
      "11111111-1111-4111-8111-111111111111",
      profile.id,
    );

    expect(profile.class).toBe("E2E Class 1");
    expect(profile.section).toBe("A");
    expect(profile.rollNo).toBe("E2E-01");
  },
  15_000,
  );

  it(
    "does not overwrite existing denormalized labels",
    async () => {
    loadStudentEnrollmentHistory.mockResolvedValue({
      status: "ready",
      rows: [
        {
          id: "enr-1",
          yearLabel: "E2E AY",
          classLabel: "Other",
          sectionLabel: "B",
          rollNo: "99",
          status: "active",
          enrolledOn: "2026-04-01",
          withdrawnOn: null,
        },
      ],
    });
    const { fillProfileFromActiveEnrollment } = await import("./load");
    const profile = {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Smoke",
      class: "10",
      section: "A",
      rollNo: "14",
      attendance: 0,
      bloodGroup: "—",
      emergencyContact: "—",
      parentName: "—",
      house: "—",
      idCardIssuedOn: "—",
      idCardValidTill: "—",
      email: "",
      bio: "",
      classTeacher: "",
      institute: "Institute",
      address: "—",
      admissionNumber: null,
      legacyCode: null,
      photoAssetPath: null,
      photoUrl: null,
    } satisfies StudentProfile;

    await fillProfileFromActiveEnrollment(
      profile,
      "11111111-1111-4111-8111-111111111111",
      profile.id,
    );
    expect(loadStudentEnrollmentHistory).not.toHaveBeenCalled();
    expect(profile.class).toBe("10");
  },
  15_000,
  );
});
