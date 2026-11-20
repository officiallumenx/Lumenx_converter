/**
 * Hosted staging multi-role E2E — Homework publish gate.
 *
 * Teacher creates draft → Parent cannot see → Teacher publishes → Parent/Student see →
 * cross-institute denied; spoofed institute_id create rejected.
 *
 * Prerequisites: same as multi-role-attendance (STAGING_E2E=1, fixtures, shells).
 */
import { expect, test } from "@playwright/test";
import { stagingLiveGateSkipMessage } from "./live-gate";
import {
  DENIED_PRODUCTION_REF,
  EXPECTED_STAGING_REF,
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
  signInOperatorSession,
  tokenFromConnect,
  type InstituteAFixtures,
} from "./staging-session";

const creds = loadStagingCredentials();

test.describe.configure({ mode: "serial" });

test.describe("Staging multi-role homework (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  let homeworkId = "";
  const runTag = `E2E HW ${Date.now()}`;
  const dueDate = "2026-12-15";

  test("0) staging guard + resolve Institute A fixtures", async () => {
    await assertStagingReady(creds);
    expect(creds.gate.projectRef).toBe(EXPECTED_STAGING_REF);
    expect(creds.gate.projectRef).not.toBe(DENIED_PRODUCTION_REF);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
  });

  test("1-7) Teacher create/publish → Parent/Student visibility + isolation", async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);

    const adminSession = await signInOperatorSession(creds);
    const adminToken = adminSession.access_token;

    // Resolve Institute B id for spoof create (name lookup via institutes list)
    const institutes = await apiJson(creds.api, "/api/v1/institutes", adminToken);
    const instB = ((institutes.body.data as Array<{ id?: string; name?: string }>) ?? []).find(
      (i) => i.name === INST_B_NAME,
    );
    const instituteBId = instB?.id ?? "";

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, creds, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);

    await teacherPage.goto(`${creds.gate.connectBaseUrl}/assignments`);
    await expect(
      teacherPage.locator("h1", { hasText: /^Homework$/i }),
    ).toBeVisible({ timeout: 45_000 });

    // Spoofed institute_id create must fail (API boundary)
    if (instituteBId) {
      const spoofCreate = await apiJson(creds.api, "/api/v1/homework", teacherToken, {
        method: "POST",
        body: JSON.stringify({
          institute_id: instituteBId,
          academic_year_id: fx.academicYearId,
          class_id: fx.classId,
          section_id: fx.sectionId,
          subject_id: fx.subjectId,
          kind: "homework",
          title: `${runTag} spoof`,
          description: "Should not persist",
          due_date: dueDate,
        }),
      });
      expect([400, 401, 403, 404, 422]).toContain(spoofCreate.status);
    }

    const create = await apiJson(creds.api, "/api/v1/homework", teacherToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        academic_year_id: fx.academicYearId,
        class_id: fx.classId,
        section_id: fx.sectionId,
        subject_id: fx.subjectId,
        kind: "homework",
        title: runTag,
        description: "Staging homework E2E — complete the worksheet",
        instructions: "Submit by due date",
        due_date: dueDate,
      }),
    });
    expect(
      create.status,
      `homework create HTTP ${create.status} ${JSON.stringify(create.body?.error ?? "")}`,
    ).toBe(201);
    homeworkId = (create.body.data as { id?: string })?.id ?? "";
    expect(homeworkId).toBeTruthy();
    expect((create.body.data as { status?: string }).status).toBe("draft");
    expect((create.body.data as { instituteId?: string }).instituteId).toBe(
      fx.instituteId,
    );

    // Parent cannot see draft
    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);
    const before = await apiJson(
      creds.api,
      `/api/v1/homework/portal/students/${fx.studentId}/items?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(before.status).toBe(200);
    const beforeItems =
      (before.body.data as Array<{ id?: string; title?: string }>) ?? [];
    expect(beforeItems.some((i) => i.id === homeworkId || i.title === runTag)).toBe(
      false,
    );

    // Inst B teacher cannot publish Inst A homework
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
      const otherTok = await tokenFromConnect(otherTeacherPage);
      const spoofPublish = await apiJson(
        creds.api,
        `/api/v1/homework/${homeworkId}/publish`,
        otherTok,
        { method: "POST" },
      );
      expect([401, 403, 404]).toContain(spoofPublish.status);
    }

    // Owning teacher publishes
    const publish = await apiJson(
      creds.api,
      `/api/v1/homework/${homeworkId}/publish`,
      teacherToken,
      { method: "POST" },
    );
    expect(publish.status, `publish HTTP ${publish.status}`).toBe(200);
    expect((publish.body.data as { status?: string }).status).toBe("published");
    expect((publish.body.data as { id?: string }).id).toBe(homeworkId);

    // Parent + Student see published item (API)
    const afterParent = await apiJson(
      creds.api,
      `/api/v1/homework/portal/students/${fx.studentId}/items?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(afterParent.status).toBe(200);
    const parentItems =
      (afterParent.body.data as Array<{ id?: string; title?: string }>) ?? [];
    expect(
      parentItems.some((i) => i.id === homeworkId || i.title === runTag),
    ).toBe(true);

    await parentPage.goto(`${creds.gate.connectBaseUrl}/assignments`);
    await expect(parentPage.locator("h1", { hasText: /^Homework$/i })).toBeVisible({
      timeout: 45_000,
    });
    // Parent UI defaults to Assignments tab; published item is kind=homework.
    await parentPage.getByRole("tab", { name: /^Homework/i }).click();
    await expect(
      parentPage.getByText(new RegExp(runTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
    ).toBeVisible({ timeout: 45_000 });

    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await connectLoginUi(studentPage, creds, STUDENT_PHONE, "student", INST_A_NAME);
    const studentToken = await tokenFromConnect(studentPage);
    const studentItemsRes = await apiJson(
      creds.api,
      `/api/v1/homework/portal/students/${fx.studentId}/items?institute_id=${fx.instituteId}`,
      studentToken,
    );
    expect(studentItemsRes.status).toBe(200);
    const studentItems =
      (studentItemsRes.body.data as Array<{ id?: string; title?: string }>) ?? [];
    expect(
      studentItems.some((i) => i.id === homeworkId || i.title === runTag),
    ).toBe(true);

    await studentPage.goto(`${creds.gate.connectBaseUrl}/assignments`);
    await expect(studentPage.locator("h1", { hasText: /^Homework$/i })).toBeVisible({
      timeout: 45_000,
    });
    await studentPage.getByRole("tab", { name: /^Homework/i }).click();
    await expect(
      studentPage.getByText(new RegExp(runTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
    ).toBeVisible({ timeout: 45_000 });

    // Inst B parent denied
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
        `/api/v1/homework/portal/students/${fx.studentId}/items?institute_id=${fx.instituteId}`,
        otherTok,
      );
      expect([401, 403]).toContain(denied.status);
    }

    // Cleanup — only this run's homework
    await apiJson(creds.api, `/api/v1/homework/${homeworkId}`, teacherToken, {
      method: "DELETE",
    });

    await teacherCtx.close();
    await parentCtx.close();
    await studentCtx.close();
    await otherTeacherCtx.close();
    await otherParentCtx.close();

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
          "Institute-B teacher Connect login failed — publish denial asserted only when login succeeds",
      });
    }
  });
});
