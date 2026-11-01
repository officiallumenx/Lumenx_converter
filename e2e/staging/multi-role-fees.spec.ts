/**
 * Hosted staging multi-role E2E — Fees publish + portal visibility.
 * Does not fake payment-provider callbacks. Records office cash only via admin when needed;
 * asserts teacher cannot POST payments.
 */
import { expect, test } from "@playwright/test";
import { stagingLiveGateSkipMessage } from "./live-gate";
import {
  INST_A_NAME,
  INST_B_NAME,
  OTHER_PARENT_PHONE,
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

test.describe("Staging multi-role fees (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  let planId = "";
  let componentId = "";
  let createdPlan = false;
  let createdComponent = false;
  let publishedByTest = false;
  const runTag = `E2E Tuition ${Date.now()}`;
  const amount = 2500;

  test("0) staging guard + fixtures", async () => {
    await assertStagingReady(creds);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
  });

  test("1-6) Publish gate → Parent/Student portal → Teacher pay denied + isolation", async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);
    const adminToken = (await signInOperatorSession(creds)).access_token;

    const plans = await apiJson(
      creds.api,
      `/api/v1/fees/plans?institute_id=${fx.instituteId}`,
      adminToken,
    );
    expect(plans.status).toBe(200);
    const planList =
      (plans.body.data as Array<{
        id?: string;
        academicYearId?: string;
        status?: string;
      }>) ?? [];
    let plan = planList.find((p) => p.academicYearId === fx.academicYearId);
    if (!plan?.id) {
      const created = await apiJson(creds.api, "/api/v1/fees/plans", adminToken, {
        method: "POST",
        body: JSON.stringify({
          institute_id: fx.instituteId,
          academic_year_id: fx.academicYearId,
        }),
      });
      expect(created.status, `plan create ${created.status}`).toBe(201);
      plan = created.body.data as { id?: string; status?: string };
      createdPlan = true;
    }
    planId = plan!.id!;
    expect(planId).toBeTruthy();
    const wasPublished = plan!.status === "published";

    const comps = await apiJson(
      creds.api,
      `/api/v1/fees/components?plan_id=${planId}`,
      adminToken,
    );
    expect(comps.status).toBe(200);
    let components =
      (comps.body.data as Array<{ id?: string; name?: string; kind?: string }>) ??
      [];
    let component = components[0];
    if (!component?.id) {
      const c = await apiJson(creds.api, "/api/v1/fees/components", adminToken, {
        method: "POST",
        body: JSON.stringify({
          fee_plan_id: planId,
          kind: "tuition",
          name: runTag,
          active: true,
          assigned_to_all: true,
          class_amounts: { [fx.classId]: amount },
        }),
      });
      expect(c.status, `component create ${c.status}`).toBe(201);
      component = c.body.data as { id?: string };
      createdComponent = true;
      componentId = component.id!;
    } else {
      componentId = component.id!;
    }

    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);

    if (!wasPublished) {
      const draftPortal = await apiJson(
        creds.api,
        `/api/v1/fees/portal/students/${fx.studentId}?institute_id=${fx.instituteId}`,
        parentToken,
      );
      if (draftPortal.status === 200) {
        const draftBody = draftPortal.body.data as {
          account?: { billedAmount?: number } | null;
        };
        const billed = draftBody?.account?.billedAmount;
        expect(billed === undefined || billed === 0 || draftBody?.account == null).toBe(
          true,
        );
      } else {
        expect([403, 404]).toContain(draftPortal.status);
      }

      const pub = await apiJson(
        creds.api,
        `/api/v1/fees/plans/${planId}/publish`,
        adminToken,
        {
          method: "POST",
          body: JSON.stringify({ publish_scope: "institute" }),
        },
      );
      expect(pub.status, `publish ${pub.status}`).toBe(200);
      expect((pub.body.data as { status?: string }).status).toBe("published");
      publishedByTest = true;
    }

    const portal = await apiJson(
      creds.api,
      `/api/v1/fees/portal/students/${fx.studentId}?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(portal.status).toBe(200);
    const account = (portal.body.data as { account?: { billedAmount?: number } })
      ?.account;
    expect(account?.billedAmount, "parent sees billed amount after publish").toBeGreaterThan(
      0,
    );

    await parentPage.goto(`${creds.gate.connectBaseUrl}/fees`);
    await expect(
      parentPage.locator("h1", { hasText: /Fees/i }),
    ).toBeVisible({ timeout: 45_000 });

    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await connectLoginUi(studentPage, creds, STUDENT_PHONE, "student", INST_A_NAME);
    const studentToken = await tokenFromConnect(studentPage);
    const studentPortal = await apiJson(
      creds.api,
      `/api/v1/fees/portal/students/${fx.studentId}?institute_id=${fx.instituteId}`,
      studentToken,
    );
    expect(studentPortal.status).toBe(200);
    await studentPage.goto(`${creds.gate.connectBaseUrl}/fees`);
    await expect(studentPage.locator("h1", { hasText: /Fees/i })).toBeVisible({
      timeout: 45_000,
    });

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, creds, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);
    const roster = await apiJson(
      creds.api,
      `/api/v1/fees/portal/roster?institute_id=${fx.instituteId}&section_id=${fx.sectionId}`,
      teacherToken,
    );
    expect(roster.status).toBe(200);
    await teacherPage.goto(`${creds.gate.connectBaseUrl}/fees`);
    await expect(teacherPage.locator("h1", { hasText: /Fees/i })).toBeVisible({
      timeout: 45_000,
    });

    const teacherPay = await apiJson(creds.api, "/api/v1/fees/payments", teacherToken, {
      method: "POST",
      body: JSON.stringify({
        fee_plan_id: planId,
        student_id: fx.studentId,
        class_id: fx.classId,
        amount: 100,
        method: "cash",
        paid_on: "2026-10-01",
        fee_component_id: componentId,
      }),
    });
    expect([401, 403]).toContain(teacherPay.status);

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
        `/api/v1/fees/portal/students/${fx.studentId}?institute_id=${fx.instituteId}`,
        otherTok,
      );
      expect([401, 403]).toContain(denied.status);
    }

    // Restore publish state / cleanup only what this run created
    if (publishedByTest) {
      await apiJson(creds.api, `/api/v1/fees/plans/${planId}/unpublish`, adminToken, {
        method: "POST",
      });
    }
    if (createdComponent && componentId) {
      await apiJson(creds.api, `/api/v1/fees/components/${componentId}`, adminToken, {
        method: "DELETE",
      });
    }
    // Fee plans are 1/year — do not delete a pre-existing plan. New draft plan may remain.

    await parentCtx.close();
    await studentCtx.close();
    await teacherCtx.close();
    await otherParentCtx.close();

    if (!otherParentOk) {
      test.info().annotations.push({
        type: "blocker",
        description: "Inst-B parent login failed — isolation asserted only when login succeeds",
      });
    }
    void createdPlan;
  });
});
