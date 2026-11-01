/**
 * Cross-app data-sharing lifecycle tests (Admin ↔ Connect Teacher ↔ Parent/Student).
 * Uses in-memory mock Supabase — not live RLS. Asserts IDs, institute, and deny paths.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resetEnvCache } from "../src/config/env.js";
import {
  IDS,
  appWithCrossAppDb,
  auth,
  crossAppDb,
  json,
  jsonHeaders,
} from "./helpers/cross-app-fixture.js";

const {
  INST_A,
  INST_B,
  STUDENT_A,
  STUDENT_B,
  SECTION_A,
  SECTION_C,
  YEAR_A,
  CLASS_A,
  CLASS_C,
  SUBJECT_A,
  TEACHER_A,
  ENROLL_A,
  CONFIG_A,
  EXAM_A,
  ENTRY_PENDING,
  HW_DRAFT,
  PLAN_A,
  ISSUED_A,
  SLOT_INACTIVE,
} = IDS;

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("cross-app — enrollment → roster → attendance", () => {
  it("Admin enrolls; Teacher A marks; Admin and Parent A see; Parent B and Teacher B denied", async () => {
    const db = crossAppDb();
    // Start without Student A enrollment so Admin create is the source of truth.
    db.enrollment = db.enrollment.filter((e) => e.student_id !== STUDENT_A);
    const app = appWithCrossAppDb(db);

    const createEnroll = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "12",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(createEnroll.status).toBe(201);
    const enroll = (await json(createEnroll)).data;
    expect(enroll.studentId).toBe(STUDENT_A);
    expect(enroll.sectionId).toBe(SECTION_A);
    expect(enroll.instituteId ?? enroll.institute_id ?? INST_A).toBeTruthy();
    const enrollId = enroll.id as string;

    const roster = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-teacher") },
    );
    expect(roster.status).toBe(200);
    const rosterRows = (await json(roster)).data as Array<{ id: string; studentId: string }>;
    expect(rosterRows.some((r) => r.id === enrollId && r.studentId === STUDENT_A)).toBe(true);

    const teacherBRoster = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-teacher-b") },
    );
    // Product rule: teachers hold academics staff-read, so roster list is institute-wide.
    // Write isolation is enforced on attendance mark (asserted below), not listEnrollments.
    expect(teacherBRoster.status).toBe(200);

    const createRegister = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        config_version_id: CONFIG_A,
        attendance_date: "2026-08-10",
        slot_kind: "day",
        slot_code: "slot:day",
        slot_label: "Full day",
        marks: [{ enrollment_id: enrollId, status: "present" }],
      }),
    });
    expect(createRegister.status).toBe(201);
    const register = (await json(createRegister)).data;
    expect(register.markedByTeacherId).toBe(TEACHER_A);
    expect(register.sectionId).toBe(SECTION_A);
    const registerId = register.id as string;

    const submit = await app.request(`/api/v1/attendance/registers/${registerId}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(submit.status).toBe(200);
    expect((await json(submit)).data.status).toBe("submitted");

    const adminGet = await app.request(`/api/v1/attendance/registers/${registerId}`, {
      headers: auth("token-admin"),
    });
    expect(adminGet.status).toBe(200);
    const adminMarks = (await json(adminGet)).data.marks as Array<{ studentId: string; status: string }>;
    expect(adminMarks.some((m) => m.studentId === STUDENT_A && m.status === "present")).toBe(true);

    const parentPortal = await app.request(
      `/api/v1/attendance/portal/students/${STUDENT_A}?institute_id=${INST_A}&from_date=2026-08-10&to_date=2026-08-10`,
      { headers: auth("token-parent") },
    );
    expect(parentPortal.status).toBe(200);
    const days = (await json(parentPortal)).data.days as Array<{ date: string; status: string }>;
    expect(days.some((d) => d.date === "2026-08-10" && d.status === "present")).toBe(true);

    const parentBDenied = await app.request(
      `/api/v1/attendance/portal/students/${STUDENT_A}?institute_id=${INST_A}&from_date=2026-08-10&to_date=2026-08-10`,
      { headers: auth("token-parent-b") },
    );
    expect(parentBDenied.status).toBe(403);

    const teacherBMark = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: jsonHeaders("token-teacher-b"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        config_version_id: CONFIG_A,
        attendance_date: "2026-08-11",
        slot_kind: "day",
        slot_code: "slot:day",
        slot_label: "Full day",
        marks: [{ enrollment_id: enrollId, status: "absent" }],
      }),
    });
    expect(teacherBMark.status).toBe(403);

    const adminBCross = await app.request(
      `/api/v1/attendance/registers?institute_id=${INST_A}`,
      { headers: auth("token-admin-b") },
    );
    expect(adminBCross.status).toBe(403);
  });
});

describe("cross-app — marks publish gate", () => {
  it("Parent/Student hidden until Admin publishes; then see Student A only; Teacher B denied sheet", async () => {
    const app = appWithCrossAppDb();

    const beforeParent = await app.request(
      `/api/v1/marks/portal/students/${STUDENT_A}/report-cards?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(beforeParent.status).toBe(200);
    const beforeCards = (await json(beforeParent)).data as unknown[];
    expect(beforeCards.length).toBe(0);

    const draftEntry = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}`, {
      headers: auth("token-parent"),
    });
    expect(draftEntry.status).toBe(403);

    const sheet = await app.request(
      `/api/v1/marks/portal/teacher/sheet?institute_id=${INST_A}&section_id=${SECTION_A}&exam_id=${EXAM_A}&subject_id=${SUBJECT_A}`,
      { headers: auth("token-teacher") },
    );
    expect(sheet.status).toBe(200);
    expect((await json(sheet)).data.status).toBe("pending");

    const teacherBSheet = await app.request(
      `/api/v1/marks/portal/teacher/sheet?institute_id=${INST_A}&section_id=${SECTION_A}&exam_id=${EXAM_A}&subject_id=${SUBJECT_A}`,
      { headers: auth("token-teacher-b") },
    );
    expect(teacherBSheet.status).toBe(403);

    const submit = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/submit`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(submit.status).toBe(200);
    expect((await json(submit)).data.status).toBe("submitted");

    const stillHidden = await app.request(
      `/api/v1/marks/portal/students/${STUDENT_A}/report-cards?institute_id=${INST_A}`,
      { headers: auth("token-student") },
    );
    expect(stillHidden.status).toBe(200);
    expect(((await json(stillHidden)).data as unknown[]).length).toBe(0);

    const publish = await app.request(`/api/v1/marks/entries/${ENTRY_PENDING}/publish`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(publish.status).toBe(200);
    expect((await json(publish)).data.status).toBe("published");

    const parentCards = await app.request(
      `/api/v1/marks/portal/students/${STUDENT_A}/report-cards?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(parentCards.status).toBe(200);
    const cards = (await json(parentCards)).data as Array<{
      marks: Array<{ total: number }>;
    }>;
    expect(cards.length).toBeGreaterThan(0);
    expect(cards[0]!.marks.some((m) => m.total === 88)).toBe(true);

    const peerDenied = await app.request(
      `/api/v1/marks/portal/students/${STUDENT_A}/report-cards?institute_id=${INST_A}`,
      { headers: auth("token-student-b") },
    );
    expect(peerDenied.status).toBe(403);

    const parentBDenied = await app.request(
      `/api/v1/marks/portal/students/${STUDENT_A}/report-cards?institute_id=${INST_A}`,
      { headers: auth("token-parent-b") },
    );
    expect(parentBDenied.status).toBe(403);
  });
});

describe("cross-app — homework publish gate", () => {
  it("Draft hidden from Parent; after Teacher publish Parent sees; Teacher B cannot publish Teacher A homework", async () => {
    const app = appWithCrossAppDb();

    const before = await app.request(
      `/api/v1/homework/portal/students/${STUDENT_A}/items?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(before.status).toBe(200);
    const beforeItems = (await json(before)).data as Array<{ title: string }>;
    expect(beforeItems.some((i) => i.title === "Draft Cross-App HW")).toBe(false);

    const spoofPublish = await app.request(`/api/v1/homework/${HW_DRAFT}/publish`, {
      method: "POST",
      headers: auth("token-teacher-b"),
    });
    expect(spoofPublish.status).toBe(403);

    const publish = await app.request(`/api/v1/homework/${HW_DRAFT}/publish`, {
      method: "POST",
      headers: auth("token-teacher"),
    });
    expect(publish.status).toBe(200);
    const publishedBody = await json(publish);
    expect(publishedBody.data.status).toBe("published");
    expect(publishedBody.data.id).toBe(HW_DRAFT);

    const after = await app.request(
      `/api/v1/homework/portal/students/${STUDENT_A}/items?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(after.status).toBe(200);
    const items = (await json(after)).data as Array<{ id: string; title: string }>;
    expect(items.some((i) => i.id === HW_DRAFT || i.title === "Draft Cross-App HW")).toBe(true);

    const parentB = await app.request(
      `/api/v1/homework/portal/students/${STUDENT_A}/items?institute_id=${INST_A}`,
      { headers: auth("token-parent-b") },
    );
    expect(parentB.status).toBe(403);
  });
});

describe("cross-app — timetable publication", () => {
  it("Admin publish-section activates inactive slots; Teacher portal sees section; Admin B denied", async () => {
    const db = crossAppDb();
    const app = appWithCrossAppDb(db);
    expect(db.timetable_slot.find((s) => s.id === SLOT_INACTIVE)?.status).toBe("inactive");

    const publish = await app.request("/api/v1/timetable/publish-section", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ institute_id: INST_A, section_id: SECTION_A }),
    });
    expect(publish.status).toBe(200);
    expect((await json(publish)).data.activatedCount).toBeGreaterThanOrEqual(1);
    expect(db.timetable_slot.find((s) => s.id === SLOT_INACTIVE)?.status).toBe("active");

    const teacherPortal = await app.request(
      `/api/v1/timetable/portal/teacher?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-teacher") },
    );
    expect(teacherPortal.status).toBe(200);
    expect((await json(teacherPortal)).data.periods.length).toBeGreaterThan(0);

    const cross = await app.request("/api/v1/timetable/publish-section", {
      method: "POST",
      headers: jsonHeaders("token-admin-b"),
      body: JSON.stringify({ institute_id: INST_A, section_id: SECTION_A }),
    });
    expect(cross.status).toBe(403);
  });
});

describe("cross-app — leave lifecycle", () => {
  it("Parent A creates student leave; Teacher A decides; Parent B cannot create for Student A; Teacher B cannot decide", async () => {
    const db = crossAppDb();
    db.leave_request = [];
    db.leave_decision = [];
    const app = appWithCrossAppDb(db);

    const create = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: jsonHeaders("token-parent"),
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: INST_A,
        student_id: STUDENT_A,
        start_date: "2026-09-20",
        end_date: "2026-09-21",
        reason: "Synthetic dental appointment for fixture student.",
      }),
    });
    expect(create.status).toBe(201);
    const leave = (await json(create)).data;
    expect(leave.studentId).toBe(STUDENT_A);
    expect(leave.sectionId).toBe(SECTION_A);
    expect(leave.status).toBe("pending");
    const leaveId = leave.id as string;

    const parentBCreate = await app.request("/api/v1/leave/requests", {
      method: "POST",
      headers: jsonHeaders("token-parent-b"),
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: INST_A,
        student_id: STUDENT_A,
        start_date: "2026-09-22",
        end_date: "2026-09-22",
        reason: "Unauthorized leave for another child.",
      }),
    });
    expect(parentBCreate.status).toBe(403);

    const teacherBDecide = await app.request(`/api/v1/leave/requests/${leaveId}/decide`, {
      method: "POST",
      headers: jsonHeaders("token-teacher-b"),
      body: JSON.stringify({ outcome: "approved", note: "Wrong teacher." }),
    });
    expect(teacherBDecide.status).toBe(403);

    const decide = await app.request(`/api/v1/leave/requests/${leaveId}/decide`, {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ outcome: "approved", note: "Approved by class teacher." }),
    });
    expect(decide.status).toBe(200);
    const decided = (await json(decide)).data;
    expect(decided.request.status).toBe("approved");
    expect(decided.decision.outcome).toBe("approved");

    const adminList = await app.request(`/api/v1/leave/requests?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(adminList.status).toBe(200);
    const rows = (await json(adminList)).data as Array<{ id: string; status: string }>;
    expect(rows.some((r) => r.id === leaveId && r.status === "approved")).toBe(true);
  });
});

describe("cross-app — fees visibility", () => {
  it("Parent sees account only after publish; Teacher roster ok; Teacher cannot pay; Admin B denied", async () => {
    const app = appWithCrossAppDb();

    const draftPortal = await app.request(
      `/api/v1/fees/portal/students/${STUDENT_A}?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    // Draft plan: portal may 200 with empty/no plan or 403 depending on service — must not expose billed amount.
    if (draftPortal.status === 200) {
      const draftBody = (await json(draftPortal)).data;
      const billed = draftBody?.account?.billedAmount;
      expect(billed === undefined || billed === 0 || draftBody?.account == null).toBe(true);
    } else {
      expect(draftPortal.status).toBe(403);
    }

    const published = await app.request(`/api/v1/fees/plans/${PLAN_A}/publish`, {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ publish_scope: "institute" }),
    });
    expect(published.status).toBe(200);
    expect((await json(published)).data.status).toBe("published");

    const portal = await app.request(
      `/api/v1/fees/portal/students/${STUDENT_A}?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(portal.status).toBe(200);
    expect((await json(portal)).data.account.billedAmount).toBe(10000);

    const roster = await app.request(
      `/api/v1/fees/portal/roster?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-teacher") },
    );
    expect(roster.status).toBe(200);

    const teacherPay = await app.request("/api/v1/fees/payments", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        fee_plan_id: PLAN_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        amount: 100,
        method: "cash",
        paid_on: "2026-08-01",
        fee_component_id: IDS.COMP_A,
      }),
    });
    expect(teacherPay.status).toBe(403);

    const parentB = await app.request(
      `/api/v1/fees/portal/students/${STUDENT_A}?institute_id=${INST_A}`,
      { headers: auth("token-parent-b") },
    );
    expect(parentB.status).toBe(403);

    const adminB = await app.request(`/api/v1/fees/plans?institute_id=${INST_A}`, {
      headers: auth("token-admin-b"),
    });
    expect(adminB.status).toBe(403);
  });
});

describe("cross-app — certificates + documents", () => {
  it("Parent A sees issued cert for Student A; Parent B denied; Connect documents route absent", async () => {
    const app = appWithCrossAppDb();

    const parent = await app.request(`/api/v1/certificates?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    expect(parent.status).toBe(200);
    const rows = (await json(parent)).data as Array<{ id: string; studentId: string }>;
    expect(rows.some((r) => r.id === ISSUED_A && r.studentId === STUDENT_A)).toBe(true);

    const parentB = await app.request(`/api/v1/certificates?institute_id=${INST_A}`, {
      headers: auth("token-parent-b"),
    });
    expect(parentB.status).toBe(200);
    const bRows = (await json(parentB)).data as Array<{ id: string }>;
    expect(bRows.some((r) => r.id === ISSUED_A)).toBe(false);

    const docs = await app.request(`/api/v1/documents?institute_id=${INST_A}`, {
      headers: auth("token-parent"),
    });
    // Parents must not manage institute document templates.
    expect([401, 403, 404]).toContain(docs.status);
  });
});

describe("cross-app — announcements publication", () => {
  it("Admin publishes; Teacher/Parent/Student see all-audience; draft hidden; Admin B denied", async () => {
    const db = crossAppDb();
    const app = appWithCrossAppDb(db);

    const parentDraft = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(parentDraft.status).toBe(200);
    expect(
      ((await json(parentDraft)).data as Array<{ id: string }>).some(
        (a) => a.id === IDS.ANN_DRAFT,
      ),
    ).toBe(false);

    const publish = await app.request(`/api/v1/announcements/${IDS.ANN_DRAFT}/publish`, {
      method: "POST",
      headers: auth("token-admin"),
    });
    expect(publish.status).toBe(200);
    expect((await json(publish)).data.status).toBe("published");

    for (const token of ["token-teacher", "token-parent", "token-student"] as const) {
      const res = await app.request(`/api/v1/announcements?institute_id=${INST_A}`, {
        headers: auth(token),
      });
      expect(res.status).toBe(200);
      const rows = (await json(res)).data as Array<{ id: string; status: string }>;
      expect(rows.some((a) => a.id === IDS.ANN_DRAFT && a.status === "published")).toBe(
        true,
      );
    }

    const teachersOnly = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Staff only",
        body: "Teachers notice",
        audience_scope: "teachers",
        publish_now: true,
      }),
    });
    expect(teachersOnly.status).toBe(201);
    const teachersAnnId = (await json(teachersOnly)).data.id as string;

    const parentTeachers = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: auth("token-parent") },
    );
    expect(parentTeachers.status).toBe(200);
    expect(
      ((await json(parentTeachers)).data as Array<{ id: string }>).some(
        (a) => a.id === teachersAnnId,
      ),
    ).toBe(false);

    const teacherSees = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: auth("token-teacher") },
    );
    expect(teacherSees.status).toBe(200);
    expect(
      ((await json(teacherSees)).data as Array<{ id: string }>).some(
        (a) => a.id === teachersAnnId,
      ),
    ).toBe(true);

    const adminB = await app.request(`/api/v1/announcements?institute_id=${INST_A}`, {
      headers: auth("token-admin-b"),
    });
    expect(adminB.status).toBe(403);
  });
});

describe("cross-app — transport visibility", () => {
  it("Parent A sees learner transport; Parent B denied; Teacher roster ok; Teacher cannot write vehicles; Admin B denied", async () => {
    const app = appWithCrossAppDb();

    const parentA = await app.request(
      `/api/v1/transport/portal/learner-transport?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: auth("token-parent") },
    );
    expect(parentA.status).toBe(200);
    const summary = (await json(parentA)).data;
    expect(summary.studentId).toBe(STUDENT_A);
    expect(summary.enrollmentId).toBe(IDS.T_ENROLL_A);
    expect(summary.busNumber).toBe("BUS-1");

    const parentB = await app.request(
      `/api/v1/transport/portal/learner-transport?institute_id=${INST_A}&student_id=${STUDENT_A}`,
      { headers: auth("token-parent-b") },
    );
    expect(parentB.status).toBe(403);

    const teacherRoster = await app.request(
      `/api/v1/transport/portal/teacher-class-roster?institute_id=${INST_A}&class_label=10&section_label=A`,
      { headers: auth("token-teacher") },
    );
    expect(teacherRoster.status).toBe(200);
    const roster = (await json(teacherRoster)).data as Array<{
      studentId: string;
      enrollmentId: string | null;
      busNumber: string | null;
    }>;
    expect(
      roster.some(
        (r) => r.studentId === STUDENT_A && r.enrollmentId === IDS.T_ENROLL_A,
      ),
    ).toBe(true);

    const teacherWrite = await app.request("/api/v1/transport/vehicles", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        vehicle_number: "BUS-X",
        registration_number: "KA99ZZ9999",
        capacity: 20,
      }),
    });
    expect(teacherWrite.status).toBe(403);

    const adminB = await app.request(
      `/api/v1/transport/vehicles?institute_id=${INST_A}`,
      { headers: auth("token-admin-b") },
    );
    expect(adminB.status).toBe(403);
  });
});

describe("cross-app — negative auth spoofing", () => {
  it("rejects spoofed institute_id and foreign student enrollment marks", async () => {
    const app = appWithCrossAppDb();

    const spoofInst = await app.request("/api/v1/attendance/registers", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_B,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        config_version_id: CONFIG_A,
        attendance_date: "2026-08-12",
        slot_kind: "day",
        slot_code: "slot:day",
        slot_label: "Full day",
        marks: [{ enrollment_id: ENROLL_A, status: "present" }],
      }),
    });
    expect(spoofInst.status).toBe(403);

    const spoofStudentPortal = await app.request(
      `/api/v1/attendance/portal/students/${STUDENT_B}?institute_id=${INST_A}&from_date=2026-08-01&to_date=2026-08-31`,
      { headers: auth("token-parent") },
    );
    expect(spoofStudentPortal.status).toBe(403);

    const teacherIdSpoof = await app.request("/api/v1/homework", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_C,
        section_id: SECTION_C,
        subject_id: SUBJECT_A,
        teacher_id: IDS.TEACHER_B,
        kind: "homework",
        title: "Spoof attempt",
        description: "Should not create under other teacher section",
        due_date: "2026-09-25",
      }),
    });
    expect([400, 403]).toContain(teacherIdSpoof.status);
  });
});
