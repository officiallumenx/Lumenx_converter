import { describe, expect, it } from "vitest";
import {
  ageOnDate,
  birthdayWishMessage,
  birthdayWhatsAppUrl,
  buildBirthdayBoard,
  daysUntilNextBirthday,
  parseDateOfBirth,
  turningAgeOnBirthday,
  whatsAppRecipientId,
  type BirthdayPerson,
} from "./birthday-workflow";
import type { StudentDirectoryRecord } from "./student-directory-store";
import type { TeacherRecord } from "@lumenx/types";

function student(overrides: Partial<StudentDirectoryRecord>): StudentDirectoryRecord {
  return {
    id: "STU-1",
    name: "Aanya Sharma",
    firstName: "Aanya",
    surname: "Sharma",
    grade: "10-A",
    attendance: 96,
    gpa: 3.8,
    status: "active",
    parent: "R. Sharma",
    parentName: "Rohan Sharma",
    parentPhone: "9876512345",
    address: "Delhi",
    gender: "Female",
    accessStatus: "active",
    dateOfBirth: "2014-08-17",
    rollNo: "12",
    ...overrides,
  };
}

describe("birthday workflow", () => {
  it("parses ISO and DMY dates", () => {
    expect(parseDateOfBirth("2014-08-17")).toEqual({ year: 2014, month: 8, day: 17 });
    expect(parseDateOfBirth("17/08/2014")).toEqual({ year: 2014, month: 8, day: 17 });
    expect(parseDateOfBirth("")).toBeNull();
  });

  it("matches today by month and day, ignoring year", () => {
    const dob = parseDateOfBirth("2011-08-17")!;
    const today = new Date(2026, 7, 17);
    expect(daysUntilNextBirthday(dob, today)).toBe(0);
    expect(turningAgeOnBirthday(dob, today)).toBe(15);
  });

  it("celebrates 29 Feb on 28 Feb in non-leap years", () => {
    const dob = parseDateOfBirth("2012-02-29")!;
    expect(daysUntilNextBirthday(dob, new Date(2026, 1, 28))).toBe(0);
    expect(daysUntilNextBirthday(dob, new Date(2024, 1, 29))).toBe(0);
  });

  it("counts upcoming days until the next birthday", () => {
    const dob = parseDateOfBirth("2014-08-20")!;
    expect(daysUntilNextBirthday(dob, new Date(2026, 7, 17))).toBe(3);
  });

  it("computes age before the birthday this year", () => {
    const dob = parseDateOfBirth("2014-12-01")!;
    expect(ageOnDate(dob, new Date(2026, 7, 17))).toBe(11);
  });

  it("builds today and upcoming lists from directory records", () => {
    const board = buildBirthdayBoard({
      now: new Date(2026, 7, 17),
      students: [
        student({ id: "STU-TODAY", dateOfBirth: "2014-08-17" }),
        student({
          id: "STU-SOON",
          name: "Kabir Sharma",
          dateOfBirth: "2013-08-20",
          parentPhone: "9876500002",
        }),
        student({
          id: "STU-LATER",
          name: "Later Child",
          dateOfBirth: "2012-01-01",
          parentPhone: "9876500003",
        }),
        student({
          id: "STU-INACTIVE",
          name: "Left School",
          status: "inactive",
          dateOfBirth: "2014-08-17",
        }),
      ],
    });
    expect(board.today.map((p) => p.id)).toEqual(["STU-TODAY"]);
    expect(board.upcoming.map((p) => p.id)).toEqual(["STU-SOON"]);
    expect(board.today[0]?.detail).toContain("10-A");
    expect(board.today[0]?.phone).toBe("9876512345");
  });

  it("teacher with today's birthday appears, without DOB does not", () => {
    const teachers: TeacherRecord[] = [
      {
        id: "T-001", name: "Sarah Johnson", role: "subject-teacher", dept: "Math",
        email: "sarah@school.edu", phone: "9876500010", password: "x",
        employeeId: "EMP-1041", joined: "Aug 2019", dateOfBirth: "1985-08-17",
        classes: 6, assignedSections: [], status: "active", subjects: ["Math"],
        portalAccess: "Faculty", qualification: "M.Sc", lastLogin: "Today",
        credentialsSentAt: null,
      },
      {
        id: "T-002", name: "No DOB Teacher", role: "subject-teacher", dept: "English",
        email: "no@school.edu", phone: "9876500011", password: "x",
        employeeId: "EMP-1042", joined: "Jun 2020", dateOfBirth: undefined,
        classes: 5, assignedSections: [], status: "active", subjects: ["English"],
        portalAccess: "Faculty", qualification: "M.A", lastLogin: "Today",
        credentialsSentAt: null,
      },
      {
        id: "T-003", name: "Pending Teacher", role: "subject-teacher", dept: "Science",
        email: "p@school.edu", phone: "9876500012", password: "x",
        employeeId: "EMP-1043", joined: "Jul 2021", dateOfBirth: "1990-08-17",
        classes: 4, assignedSections: [], status: "pending", subjects: [],
        portalAccess: "Faculty", qualification: "M.Sc", lastLogin: "Never",
        credentialsSentAt: null,
      },
    ];
    const board = buildBirthdayBoard({ now: new Date(2026, 7, 17), students: [], teachers });
    expect(board.today.map((p) => p.id)).toEqual(["T-001"]);
    expect(board.today[0]?.role).toBe("Teacher");
    expect(board.today[0]?.turningAge).toBe(41);
  });

  it("student + teacher birthdays on same day, no duplicates", () => {
    const teachers: TeacherRecord[] = [
      {
        id: "T-001", name: "Sarah Johnson", role: "subject-teacher", dept: "Math",
        email: "sarah@school.edu", phone: "9876500010", password: "x",
        employeeId: "EMP-1041", joined: "Aug 2019", dateOfBirth: "1985-08-17",
        classes: 6, assignedSections: [], status: "active", subjects: ["Math"],
        portalAccess: "Faculty", qualification: "M.Sc", lastLogin: "Today",
        credentialsSentAt: null,
      },
    ];
    const board = buildBirthdayBoard({
      now: new Date(2026, 7, 17),
      students: [student({ id: "STU-TODAY", dateOfBirth: "2014-08-17" })],
      teachers,
    });
    expect(board.today).toHaveLength(2);
    expect(board.today.map((p) => p.id).sort()).toEqual(["STU-TODAY", "T-001"]);
  });

  it("teacher upcoming birthday within 7 days", () => {
    const teachers: TeacherRecord[] = [
      {
        id: "T-004", name: "Upcoming Teacher", role: "subject-teacher", dept: "Hindi",
        email: "u@school.edu", phone: "9876500013", password: "x",
        employeeId: "EMP-1044", joined: "Jan 2020", dateOfBirth: "1988-08-20",
        classes: 5, assignedSections: [], status: "active", subjects: ["Hindi"],
        portalAccess: "Faculty", qualification: "M.A", lastLogin: "Today",
        credentialsSentAt: null,
      },
    ];
    const board = buildBirthdayBoard({ now: new Date(2026, 7, 17), students: [], teachers });
    expect(board.upcoming.map((p) => p.id)).toEqual(["T-004"]);
    expect(board.upcoming[0]?.daysUntil).toBe(3);
  });

  it("builds a WhatsApp URL to the parent with a pre-filled student message", () => {
    const person: BirthdayPerson = {
      id: "STU-TODAY",
      name: "Aanya Sharma",
      role: "Student",
      detail: "10-A",
      phone: "9876512345",
      dateOfBirth: "2014-08-17",
      turningAge: 12,
      daysUntil: 0,
    };
    expect(whatsAppRecipientId(person.phone)).toBe("919876512345");
    const url = birthdayWhatsAppUrl(person, "Test1School");
    expect(url).toContain("https://wa.me/919876512345?text=");
    expect(birthdayWishMessage(person, "Test1School")).toContain("Aanya Sharma");
    expect(birthdayWishMessage(person, "Test1School")).toContain(
      "Test1School",
    );
  });
});
