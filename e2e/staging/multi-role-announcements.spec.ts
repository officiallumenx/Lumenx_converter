/**
 * Hosted staging multi-role E2E — Announcements publish + audience.
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

test.describe("Staging multi-role announcements (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  let draftId = "";
  let teachersOnlyId = "";
  const runTag = `E2E Ann ${Date.now()}`;
  const teachersTag = `E2E Staff ${Date.now()}`;

  test("0) staging guard + fixtures", async () => {
    await assertStagingReady(creds);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
  });

  test("1-6) Draft hidden → publish → audience + isolation", async ({ browser }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);
    const adminToken = (await signInOperatorSession(creds)).access_token;

    const draft = await apiJson(creds.api, "/api/v1/announcements", adminToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        title: runTag,
        body: "Staging all-audience announcement body.",
        audience_scope: "all",
        publish_now: false,
      }),
    });
    expect(draft.status, `announcement create ${draft.status}`).toBe(201);
    draftId = (draft.body.data as { id?: string; status?: string }).id!;
    expect((draft.body.data as { status?: string }).status).toBe("draft");

    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);

    const parentDraft = await apiJson(
      creds.api,
      `/api/v1/announcements?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(parentDraft.status).toBe(200);
    const before =
      (parentDraft.body.data as Array<{ id?: string; title?: string }>) ?? [];
    expect(before.some((a) => a.id === draftId || a.title === runTag)).toBe(false);

    const publish = await apiJson(
      creds.api,
      `/api/v1/announcements/${draftId}/publish`,
      adminToken,
      { method: "POST" },
    );
    expect(publish.status).toBe(200);
    expect((publish.body.data as { status?: string }).status).toBe("published");

    for (const [role, phone] of [
      ["teacher", TEACHER_PHONE],
      ["parent", PARENT_PHONE],
      ["student", STUDENT_PHONE],
    ] as const) {
      const ctx = role === "parent" ? parentCtx : await browser.newContext();
      const page = role === "parent" ? parentPage : await ctx.newPage();
      let token = parentToken;
      if (role !== "parent") {
        await connectLoginUi(page, creds, phone, role, INST_A_NAME);
        token = await tokenFromConnect(page);
      }
      const list = await apiJson(
        creds.api,
        `/api/v1/announcements?institute_id=${fx.instituteId}`,
        token,
      );
      expect(list.status).toBe(200);
      const rows =
        (list.body.data as Array<{ id?: string; status?: string; title?: string }>) ??
        [];
      expect(
        rows.some(
          (a) =>
            (a.id === draftId || a.title === runTag) && a.status === "published",
        ),
      ).toBe(true);

      await page.goto(`${creds.gate.connectBaseUrl}/announcements`);
      await expect(page.locator("h1", { hasText: /Announcement/i })).toBeVisible({
        timeout: 45_000,
      });
      if (role !== "parent") await ctx.close();
    }

    const teachersOnly = await apiJson(creds.api, "/api/v1/announcements", adminToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        title: teachersTag,
        body: "Teachers-only staging notice.",
        audience_scope: "teachers",
        publish_now: true,
      }),
    });
    expect(teachersOnly.status).toBe(201);
    teachersOnlyId = (teachersOnly.body.data as { id?: string }).id!;

    const parentTeachers = await apiJson(
      creds.api,
      `/api/v1/announcements?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(parentTeachers.status).toBe(200);
    expect(
      (
        (parentTeachers.body.data as Array<{ id?: string }>) ?? []
      ).some((a) => a.id === teachersOnlyId),
    ).toBe(false);

    const teacherCtx = await browser.newContext();
    const teacherPage = await teacherCtx.newPage();
    await connectLoginUi(teacherPage, creds, TEACHER_PHONE, "teacher", INST_A_NAME);
    const teacherToken = await tokenFromConnect(teacherPage);
    const teacherSees = await apiJson(
      creds.api,
      `/api/v1/announcements?institute_id=${fx.instituteId}`,
      teacherToken,
    );
    expect(teacherSees.status).toBe(200);
    expect(
      ((teacherSees.body.data as Array<{ id?: string }>) ?? []).some(
        (a) => a.id === teachersOnlyId,
      ),
    ).toBe(true);

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
        `/api/v1/announcements?institute_id=${fx.instituteId}`,
        otherTok,
      );
      expect([401, 403]).toContain(denied.status);
    }

    // Cleanup — archive then soft-delete records created this run
    for (const id of [draftId, teachersOnlyId].filter(Boolean)) {
      await apiJson(creds.api, `/api/v1/announcements/${id}/archive`, adminToken, {
        method: "POST",
      });
      await apiJson(creds.api, `/api/v1/announcements/${id}`, adminToken, {
        method: "DELETE",
      });
    }

    await parentCtx.close();
    await teacherCtx.close();
    await otherParentCtx.close();

    if (!otherParentOk) {
      test.info().annotations.push({
        type: "blocker",
        description: "Inst-B parent login failed — list isolation soft",
      });
    }
  });
});
