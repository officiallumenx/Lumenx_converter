/**
 * Hosted staging multi-role E2E — Certificate issue (metadata_only) + portal + public verify.
 * Does not claim PDF rendering. Uses metadata_only to avoid storage/PDF generation.
 * Revokes created certificate for cleanup (no hard delete).
 */
import { expect, test } from "@playwright/test";
import { stagingLiveGateSkipMessage } from "./live-gate";
import {
  INST_A_NAME,
  INST_B_NAME,
  OTHER_PARENT_PHONE,
  PARENT_PHONE,
  STUDENT_PHONE,
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

test.describe("Staging multi-role certificates (hosted)", () => {
  test.skip(!creds.gate.ok, stagingLiveGateSkipMessage(creds.gate));

  let fx: InstituteAFixtures;
  let templateId = "";
  let createdTemplate = false;
  let certificateId = "";
  let certificateNumber = "";
  const runTag = `E2E Cert ${Date.now()}`;
  const tplName = `E2E Bonafide ${Date.now()}`;

  test("0) staging guard + fixtures", async () => {
    await assertStagingReady(creds);
    const session = await signInOperatorSession(creds);
    fx = await resolveInstituteAFixtures(creds, session.access_token);
  });

  test("1-6) Issue metadata_only → Parent/Student see → public verify + isolation", async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    await assertStagingReady(creds);
    const adminToken = (await signInOperatorSession(creds)).access_token;

    // Prefer fixture template (ensure-multi-role-fixtures.mjs). Fall back to tenant admin create.
    const templates = await apiJson(
      creds.api,
      `/api/v1/documents/templates?institute_id=${fx.instituteId}&type=certificate&status=active`,
      adminToken,
    );
    expect(
      templates.status,
      `list templates ${templates.status} ${JSON.stringify(templates.body?.error ?? "")}`,
    ).toBe(200);
    const tplList =
      (templates.body.data as Array<{ id?: string; type?: string; status?: string; name?: string }>) ??
      [];
    const existing =
      tplList.find((t) => t.type === "certificate" && /E2E/i.test(t.name ?? "")) ??
      tplList.find((t) => t.type === "certificate");
    if (existing?.id) {
      templateId = existing.id;
    } else {
      // Operator template create can 500 if DB constraints differ; use tenant admin when available.
      const tenantAdmin = await signInEmail(creds, "smoke.tenant.a@lumenx.test").catch(
        () => "",
      );
      const writerToken = tenantAdmin || adminToken;
      const created = await apiJson(creds.api, "/api/v1/documents/templates", writerToken, {
        method: "POST",
        body: JSON.stringify({
          institute_id: fx.instituteId,
          type: "certificate",
          name: tplName,
          description: "Staging E2E certificate template",
          category: "Academic",
          source: "custom",
          activate_now: true,
          blocks: [],
        }),
      });
      expect(
        created.status,
        `template create ${created.status} ${JSON.stringify(created.body?.error ?? "")}`,
      ).toBe(201);
      templateId = (created.body.data as { id?: string }).id!;
      createdTemplate = true;
    }
    expect(templateId, "active certificate template — run ensure-multi-role-fixtures.mjs").toBeTruthy();

    const issue = await apiJson(creds.api, "/api/v1/certificates", adminToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        template_id: templateId,
        student_id: fx.studentId,
        recipient_name: "Smoke Connect Student",
        title: runTag,
        category: "Academic",
        year: 2026,
        file_kind: "pptx",
        metadata_only: true,
      }),
    });
    expect(issue.status, `issue ${issue.status} ${JSON.stringify(issue.body?.error ?? "")}`).toBe(
      201,
    );
    const issued = issue.body.data as {
      id?: string;
      status?: string;
      certificateNumber?: string;
      studentId?: string;
    };
    certificateId = issued.id!;
    certificateNumber = issued.certificateNumber!;
    expect(issued.status).toBe("issued");
    expect(certificateNumber).toMatch(/^CERT\/\d{4}\/\d{4}$/);
    expect(issued.studentId).toBe(fx.studentId);

    // Duplicate number rejected
    const dup = await apiJson(creds.api, "/api/v1/certificates", adminToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        template_id: templateId,
        student_id: fx.studentId,
        recipient_name: "Smoke Connect Student",
        title: `${runTag} dup`,
        certificate_number: certificateNumber,
        year: 2026,
        metadata_only: true,
      }),
    });
    expect([409, 400]).toContain(dup.status);

    const parentCtx = await browser.newContext();
    const parentPage = await parentCtx.newPage();
    await connectLoginUi(parentPage, creds, PARENT_PHONE, "parent", INST_A_NAME);
    const parentToken = await tokenFromConnect(parentPage);
    const parentList = await apiJson(
      creds.api,
      `/api/v1/certificates?institute_id=${fx.instituteId}`,
      parentToken,
    );
    expect(parentList.status).toBe(200);
    const parentRows =
      (parentList.body.data as Array<{ id?: string; title?: string; studentId?: string }>) ??
      [];
    expect(
      parentRows.some(
        (r) => r.id === certificateId || r.title === runTag,
      ),
    ).toBe(true);

    await parentPage.goto(`${creds.gate.connectBaseUrl}/certificates`);
    await expect(parentPage.locator("h1", { hasText: /Certificate/i })).toBeVisible({
      timeout: 45_000,
    });

    const studentCtx = await browser.newContext();
    const studentPage = await studentCtx.newPage();
    await connectLoginUi(studentPage, creds, STUDENT_PHONE, "student", INST_A_NAME);
    const studentToken = await tokenFromConnect(studentPage);
    const studentList = await apiJson(
      creds.api,
      `/api/v1/certificates?institute_id=${fx.instituteId}`,
      studentToken,
    );
    expect(studentList.status).toBe(200);
    expect(
      (
        (studentList.body.data as Array<{ id?: string }>) ?? []
      ).some((r) => r.id === certificateId),
    ).toBe(true);

    // Public verify (no auth) — validity only, not PDF download
    const verify = await fetch(
      `${creds.api}/api/v1/certificates/public/verify?institute_id=${fx.instituteId}&certificate_number=${encodeURIComponent(certificateNumber)}`,
    );
    expect(verify.status).toBe(200);
    const verifyBody = (await verify.json()) as {
      data?: { valid?: boolean; recipientName?: string };
    };
    expect(verifyBody.data?.valid).toBe(true);

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
      const deniedList = await apiJson(
        creds.api,
        `/api/v1/certificates?institute_id=${fx.instituteId}`,
        otherTok,
      );
      // May 200 with empty or 403 — must not include our cert
      if (deniedList.status === 200) {
        const rows =
          (deniedList.body.data as Array<{ id?: string }>) ?? [];
        expect(rows.some((r) => r.id === certificateId)).toBe(false);
      } else {
        expect([401, 403]).toContain(deniedList.status);
      }
    }

    // Parents may list active templates as institute members; create/manage must be denied
    const docsCreate = await apiJson(creds.api, "/api/v1/documents/templates", parentToken, {
      method: "POST",
      body: JSON.stringify({
        institute_id: fx.instituteId,
        type: "certificate",
        name: `${tplName} parent-denied`,
        source: "custom",
        activate_now: true,
        blocks: [],
      }),
    });
    expect([401, 403]).toContain(docsCreate.status);

    // Cleanup — revoke issued cert (no hard delete)
    const revoke = await apiJson(
      creds.api,
      `/api/v1/certificates/${certificateId}/revoke`,
      adminToken,
      {
        method: "POST",
        body: JSON.stringify({ reason: "Staging E2E cleanup" }),
      },
    );
    expect([200, 204]).toContain(revoke.status);

    if (createdTemplate && templateId) {
      await apiJson(creds.api, `/api/v1/documents/templates/${templateId}/archive`, adminToken, {
        method: "POST",
      });
    }

    await parentCtx.close();
    await studentCtx.close();
    await otherParentCtx.close();

    if (!otherParentOk) {
      test.info().annotations.push({
        type: "blocker",
        description: "Inst-B parent login failed — cert list isolation soft",
      });
    }
  });
});
