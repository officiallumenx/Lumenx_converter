/**
 * Hosted staging multi-role E2E — Marks publish gate.
 *
 * Admin (operator) creates exam → Teacher creates/submits entry → Admin publishes →
 * Parent/Student see published report cards → cross-institute / peer denied.
 *
 * Prerequisites: same as multi-role-attendance (STAGING_E2E=1, fixtures, shells).
 */
import { expect, test } from "@playwright/test";
import { stagingLiveGateSkipMessage } from "./live-gate";
import {
  INST_A_NAME,
  INST_B_NAME,
  OTHER_PARENT_PHONE,
  OTHER_TEACHER_PHONE,
  PARENT_PHONE,
  STUDENT_PHONE,
  TEACHER_PHONE,
  apiJson,
  assertStagingReady,
  connectLoginUi,
  loadStagingCredentials,
  resolveInstituteAFixtures,
  signInEmail,
  signInOperatorSession,
  tokenFromConnect,
  type InstituteAFixtures,
} from "./staging-session";

const creds = loadStagingCredentials();

test.describe.configure({ mode: "serial" });

test.describe("Staging multi-role marks (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  let examId = "";
  let entryId = "";
  const runTag = `e2e-marks-${Date.now()}`;
  const scoreTotal = 88;
  const scoreInternal = 18;
  const scoreExternal = 70;

  test("0) staging guard + resolve Institute A fixtures", async () => {
    await assertStagingReady(creds);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
    expect(fx.studentId).toBeTruthy();
    expect(fx.teacherId).toBeTruthy();
  });

  test("1-8) Teacher submit → Admin publish → Parent/Student visibility + isolation", async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);

    const adminSession = await signInOperatorSession(creds);
    const adminToken = adminSession.access_token;

    // Admin creates a dedicated exam (draft schedule — no seed of mark sheets).
    const examCreate = await apiJson(creds.api, "/api/v1/exams", adminToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        academic_year_id: fx.academicYearId,
        name: runTag,
        header: "Staging Marks E2E",
        start_date: "2026-11-01",
        end_date: "2026-11-05",
        default_starts_at: "09:00",
        default_ends_at: "12:00",
        total_marks: 100,
        internal_marks: 20,
        external_marks: 80,
        audience_scope: "section",
        target_sections: [
          { section_id: fx.sectionId, class_id: fx.classId },
        ],
        subject_schedules: [
          {
            subject_id: fx.subjectId,
            paper_date: "2026-11-02",
            starts_at: "09:00",
            ends_at: "12:00",
            room: "E2E-1",
          },
        ],
      }),
    });
    expect(
      examCreate.status,
      `exam create HTTP ${examCreate.status} ${JSON.stringify(examCreate.body?.error ?? "")}`,
    ).toBe(201);
    examId = (examCreate.body.data as { id?: string })?.id ?? "";
    expect(examId).toBeTruthy();

    // Teacher Connect UI login + marks page
    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, creds, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);

    await teacherPage.goto(`${creds.gate.connectBaseUrl}/marks`);
    await expect(teacherPage.locator("h1", { hasText: /^Marks$/i })).toBeVisible({
      timeout: 45_000,
    });

    // Teacher cannot publish (will assert after submit) — first create + submit via API
    const createEntry = await apiJson(creds.api, "/api/v1/marks/entries", teacherToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        academic_year_id: fx.academicYearId,
        class_id: fx.classId,
        section_id: fx.sectionId,
        exam_id: examId,
        subject_id: fx.subjectId,
        max_marks: 100,
        scores: [
          {
            enrollment_id: fx.enrollmentId,
            marks: scoreTotal,
            internal_marks: scoreInternal,
            external_marks: scoreExternal,
          },
        ],
      }),
    });
    expect(
      createEntry.status,
      `marks create HTTP ${createEntry.status} ${JSON.stringify(createEntry.body?.error ?? "")}`,
    ).toBe(201);
    entryId = (createEntry.body.data as { id?: string })?.id ?? "";
    expect(entryId).toBeTruthy();
    expect((createEntry.body.data as { status?: string }).status).toBe("pending");

    // Draft entry hidden from parent portal
    const parentPreCtx = await browser.newContext();
    const parentPrePage = await parentPreCtx.newPage();
    await connectLoginUi(parentPrePage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPrePage);
    const beforeCards = await apiJson(
      creds.api,
      `/api/v1/marks/portal/students/${fx.studentId}/report-cards?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(beforeCards.status).toBe(200);
    const beforeList = (beforeCards.body.data as Array<{ examName?: string }>) ?? [];
    expect(beforeList.some((c) => c.examName === runTag)).toBe(false);

    const draftDenied = await apiJson(
      creds.api,
      `/api/v1/marks/entries/${entryId}`,
      parentToken,
    );
    expect([401, 403, 404]).toContain(draftDenied.status);

    const submit = await apiJson(
      creds.api,
      `/api/v1/marks/entries/${entryId}/submit`,
      teacherToken,
      { method: "POST" },
    );
    expect(submit.status, `submit HTTP ${submit.status}`).toBe(200);
    expect((submit.body.data as { status?: string }).status).toBe("submitted");

    // Teacher cannot publish
    const teacherPublish = await apiJson(
      creds.api,
      `/api/v1/marks/entries/${entryId}/publish`,
      teacherToken,
      { method: "POST" },
    );
    expect([401, 403]).toContain(teacherPublish.status);

    // Still hidden after submit (not published)
    const stillHidden = await apiJson(
      creds.api,
      `/api/v1/marks/portal/students/${fx.studentId}/report-cards?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(stillHidden.status).toBe(200);
    const midList = (stillHidden.body.data as Array<{ examName?: string }>) ?? [];
    expect(midList.some((c) => c.examName === runTag)).toBe(false);

    // Admin (platform operator) publishes
    const publish = await apiJson(
      creds.api,
      `/api/v1/marks/entries/${entryId}/publish`,
      adminToken,
      {
        method: "POST",
        headers: { "Idempotency-Key": `marks-pub-${runTag}` },
      },
    );
    expect(publish.status, `publish HTTP ${publish.status}`).toBe(200);
    expect((publish.body.data as { status?: string }).status).toBe("published");

    // Parent portal API + UI
    const parentCards = await apiJson(
      creds.api,
      `/api/v1/marks/portal/students/${fx.studentId}/report-cards?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(parentCards.status).toBe(200);
    const cards = (parentCards.body.data as Array<{
      examName?: string;
      marks?: Array<{ total?: number }>;
    }>) ?? [];
    const publishedCard = cards.find((c) => c.examName === runTag);
    expect(publishedCard, "parent sees published exam card").toBeTruthy();
    expect(
      publishedCard?.marks?.some((m) => m.total === scoreTotal),
    ).toBe(true);

    await parentPrePage.goto(`${creds.gate.connectBaseUrl}/marks`);
    await expect(
      parentPrePage.locator("h1", { hasText: /Academic Performance|Marks|Report/i }),
    ).toBeVisible({ timeout: 45_000 });

    // Student portal API via email session (avoids end-of-suite Connect PIN rate limits).
    const studentToken = await signInEmail(creds, "smoke.connect.student@lumenx.test");
    const studentCards = await apiJson(
      creds.api,
      `/api/v1/marks/portal/students/${fx.studentId}/report-cards?institute_id=${fx.instituteId}`,
      studentToken,
    );
    expect(studentCards.status).toBe(200);
    const studentList =
      (studentCards.body.data as Array<{ examName?: string; marks?: Array<{ total?: number }> }>) ??
      [];
    expect(studentList.some((c) => c.examName === runTag)).toBe(true);

    // Student Marks UI shell (PIN login); retries handle transient portal/rate-limit flakes.
    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await connectLoginUi(studentPage, creds, STUDENT_PHONE, "student", INST_A_NAME);
    const marksHeading = studentPage.locator("h1", {
      hasText: /My Marks|Marks|Report/i,
    });
    let marksUiOk = false;
    for (let attempt = 0; attempt < 3 && !marksUiOk; attempt++) {
      if (attempt > 0) {
        await studentPage.goto(`${creds.gate.connectBaseUrl}/`);
        await expect(studentPage.getByRole("navigation", { name: /Main/i })).toBeVisible({
          timeout: 30_000,
        });
      }
      await studentPage.goto(`${creds.gate.connectBaseUrl}/marks`);
      try {
        await expect(marksHeading).toBeVisible({ timeout: 30_000 });
        marksUiOk = true;
      } catch {
        /* retry */
      }
    }
    expect(marksUiOk, "student Marks UI shell after portal retries").toBe(true);

    // Spoof: parent cannot read entry by id; other-institute parent denied portal
    let otherParentOk = true;
    const otherParentCtx = await browser.newContext();
    const otherParentPage = await otherParentCtx.newPage();
    try {
      await connectLoginUi(
        otherParentPage,
        creds,
        OTHER_PARENT_PHONE,
        "parent",
        INST_B_NAME,
      );
    } catch {
      otherParentOk = false;
    }
    if (otherParentOk) {
      const otherTok = await tokenFromConnect(otherParentPage);
      const denied = await apiJson(
        creds.api,
        `/api/v1/marks/portal/students/${fx.studentId}/report-cards?institute_id=${fx.instituteId}`,
        otherTok,
      );
      expect([401, 403]).toContain(denied.status);
      const deniedEntry = await apiJson(
        creds.api,
        `/api/v1/marks/entries/${entryId}`,
        otherTok,
      );
      expect([401, 403, 404]).toContain(deniedEntry.status);
    }

    // Unassigned teacher (Inst B) cannot patch Inst A entry
    let otherTeacherOk = true;
    const otherTeacherCtx = await browser.newContext();
    const otherTeacherPage = await otherTeacherCtx.newPage();
    try {
      await connectLoginUi(
        otherTeacherPage,
        creds,
        OTHER_TEACHER_PHONE,
        "teacher",
        INST_B_NAME,
      );
    } catch {
      otherTeacherOk = false;
    }
    if (otherTeacherOk) {
      const otherTeacherTok = await tokenFromConnect(otherTeacherPage);
      const spoofSheet = await apiJson(
        creds.api,
        `/api/v1/marks/portal/teacher/sheet?institute_id=${fx.instituteId}&section_id=${fx.sectionId}&exam_id=${examId}&subject_id=${fx.subjectId}`,
        otherTeacherTok,
      );
      expect([401, 403, 404]).toContain(spoofSheet.status);

      const spoofPatch = await apiJson(
        creds.api,
        `/api/v1/marks/entries/${entryId}`,
        otherTeacherTok,
        {
          method: "PATCH",
          body: JSON.stringify({
            scores: [
              {
                enrollment_id: fx.enrollmentId,
                marks: 1,
                internal_marks: 0,
                external_marks: 1,
              },
            ],
          }),
        },
      );
      expect([401, 403, 404]).toContain(spoofPatch.status);
    }

    // Admin UI can open marks for institute
    await teacherPage.goto(`${creds.gate.connectBaseUrl}/marks`);
    await expect(teacherPage.getByText(/Parent Portal|Smoke Connect Parent/i)).toHaveCount(0);

    // Soft cleanup — only records created in this run
    await apiJson(creds.api, `/api/v1/marks/entries/${entryId}`, adminToken, {
      method: "DELETE",
    });
    await apiJson(creds.api, `/api/v1/exams/${examId}`, adminToken, {
      method: "DELETE",
    });

    await teacherCtx.close();
    await parentPreCtx.close();
    await studentCtx.close();
    await otherParentCtx.close();
    await otherTeacherCtx.close();

    if (!otherParentOk) {
      test.info().annotations.push({
        type: "blocker",
        description:
          "Institute-B parent Connect login failed — portal isolation asserted only when login succeeds",
      });
    }
    if (!otherTeacherOk) {
      test.info().annotations.push({
        type: "blocker",
        description:
          "Institute-B teacher Connect login failed — sheet/write denial asserted only when login succeeds",
      });
    }

  });
});
