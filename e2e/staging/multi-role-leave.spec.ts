/**
 * Hosted staging multi-role E2E — Leave lifecycle.
 * Parent creates → Teacher decides; cancel path; isolation.
 * Distinguishes cancelled (requester withdraw) from rejected (reviewer decide).
 */
import { expect, test } from "@playwright/test";
import { stagingLiveGateSkipMessage } from "./live-gate";
import {
  INST_A_NAME,
  INST_B_NAME,
  OTHER_PARENT_PHONE,
  OTHER_TEACHER_PHONE,
  PARENT_PHONE,
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

test.describe("Staging multi-role leave (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  const stamp = Date.now();
  // Far-future dates avoid colliding with school calendars / prior runs
  const startApprove = "2027-03-10";
  const endApprove = "2027-03-11";
  const startCancel = "2027-04-05";
  const endCancel = "2027-04-05";

  test("0) staging guard + fixtures", async () => {
    await assertStagingReady(creds);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
  });

  test("1-7) Parent create → Teacher approve + cancel + isolation", async ({ browser }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);
    const adminToken = (await signInOperatorSession(creds)).access_token;

    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);

    await parentPage.goto(`${creds.gate.connectBaseUrl}/leave`);
    await expect(
      parentPage.locator("h1", { hasText: /Leave management/i }),
    ).toBeVisible({ timeout: 45_000 });

    const create = await apiJson(creds.api, "/api/v1/leave/requests", parentToken, {
      method: "POST",
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: fx.instituteId,
        student_id: fx.studentId,
        start_date: startApprove,
        end_date: endApprove,
        reason: `Staging leave approval E2E ${stamp} dental appointment fixture.`,
      }),
    });
    expect(create.status, `leave create ${create.status}`).toBe(201);
    const leaveId = (create.body.data as { id?: string; status?: string }).id!;
    expect((create.body.data as { status?: string }).status).toBe("pending");

    // Inst-B parent cannot create for Inst-A student
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
      const spoof = await apiJson(creds.api, "/api/v1/leave/requests", otherTok, {
        method: "POST",
        body: JSON.stringify({
          subject_kind: "student",
          institute_id: fx.instituteId,
          student_id: fx.studentId,
          start_date: "2027-05-01",
          end_date: "2027-05-01",
          reason: "Unauthorized leave for another institute child.",
        }),
      });
      expect([401, 403]).toContain(spoof.status);
    }

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, creds, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);
    await teacherPage.goto(`${creds.gate.connectBaseUrl}/leave`);
    await expect(
      teacherPage.locator("h1", { hasText: /Leave management/i }),
    ).toBeVisible({ timeout: 45_000 });

    // Inst-B teacher cannot decide
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
      const denied = await apiJson(
        creds.api,
        `/api/v1/leave/requests/${leaveId}/decide`,
        otherTok,
        {
          method: "POST",
          body: JSON.stringify({ outcome: "approved", note: "Wrong teacher" }),
        },
      );
      expect([401, 403, 404]).toContain(denied.status);
    }

    const decide = await apiJson(
      creds.api,
      `/api/v1/leave/requests/${leaveId}/decide`,
      teacherToken,
      {
        method: "POST",
        headers: { "Idempotency-Key": `leave-decide-${stamp}` },
        body: JSON.stringify({
          outcome: "approved",
          note: "Approved by class teacher (staging E2E).",
        }),
      },
    );
    expect(decide.status, `decide ${decide.status}`).toBe(200);
    const decided = decide.body.data as {
      request?: { status?: string };
      decision?: { outcome?: string };
    };
    expect(decided.request?.status).toBe("approved");
    expect(decided.decision?.outcome).toBe("approved");

    const adminList = await apiJson(
      creds.api,
      `/api/v1/leave/requests?institute_id=${fx.instituteId}`,
      adminToken,
    );
    expect(adminList.status).toBe(200);
    const rows =
      (adminList.body.data as Array<{ id?: string; status?: string }>) ?? [];
    expect(rows.some((r) => r.id === leaveId && r.status === "approved")).toBe(true);

    // Cancel path: pending → cancelled (not rejected)
    const createCancel = await apiJson(creds.api, "/api/v1/leave/requests", parentToken, {
      method: "POST",
      body: JSON.stringify({
        subject_kind: "student",
        institute_id: fx.instituteId,
        student_id: fx.studentId,
        start_date: startCancel,
        end_date: endCancel,
        reason: `Staging leave cancel E2E ${stamp} plans changed by parent.`,
      }),
    });
    expect(createCancel.status).toBe(201);
    const cancelId = (createCancel.body.data as { id?: string }).id!;
    const cancel = await apiJson(
      creds.api,
      `/api/v1/leave/requests/${cancelId}/cancel`,
      parentToken,
      { method: "POST" },
    );
    expect(cancel.status, `cancel ${cancel.status}`).toBe(200);
    expect((cancel.body.data as { status?: string }).status).toBe("cancelled");
    expect((cancel.body.data as { status?: string }).status).not.toBe("rejected");

    await parentCtx.close();
    await teacherCtx.close();
    await otherParentCtx.close();
    await otherTeacherCtx.close();

    if (!otherParentOk) {
      test.info().annotations.push({
        type: "blocker",
        description: "Inst-B parent login failed — create isolation soft",
      });
    }
    if (!otherTeacherOk) {
      test.info().annotations.push({
        type: "blocker",
        description: "Inst-B teacher login failed — decide isolation soft",
      });
    }
  });
});
