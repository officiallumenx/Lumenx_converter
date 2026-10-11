import type { Page, Route } from "@playwright/test";
import { blockApiWrites } from "../safe-api";

export const E2E_INSTITUTE_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const E2E_ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111";

export { blockApiWrites };

/**
 * Optimistic Admin API session + fake Supabase auth storage so the API client
 * attaches a Bearer token. Real Supabase Auth traffic must be blocked via
 * `blockHostedSupabaseAuth`.
 */
export async function installOptimisticAdminSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ instituteId, userId }) => {
      const now = Date.now();
      const expiresAt = Math.floor(now / 1000) + 86_400;
      // Minimal unsigned JWT-shaped token for client attachment only (never validated here).
      const accessToken =
        "eyJhbGciOiJub25lIn0.eyJzdWIiOiJlMmUtZG9jcy1jZXJ0cyIsImV4cCI6OTk5OTk5OTk5OX0.e2e";
      localStorage.setItem("lx_admin_remember", "1");
      localStorage.setItem("lumenx.admin.activeInstituteId.v1", instituteId);
      // Prevent setup checklist from bouncing Documents/Certificates deep links to /setup.
      localStorage.setItem(
        `lumenx.admin.setup-core-complete.v1:${instituteId}`,
        JSON.stringify({ complete: true, at: now }),
      );
      localStorage.setItem(
        "lx_admin_session_v1",
        JSON.stringify({
          userId,
          email: "e2e-docs-certs@example.com",
          phone: "",
          name: "E2E Docs Certs",
          initials: "ED",
          role: "super_admin",
          title: "institute admin",
          accessRoleId: undefined,
          instituteId,
          instituteName: "Alpha Public School",
          isVerified: true,
          token: "",
          authSource: "api",
          issuedAt: now,
          expiresAt: now + 86_400_000,
        }),
      );
      localStorage.setItem(
        "lumenx.admin.supabase.auth.v1",
        JSON.stringify({
          access_token: accessToken,
          token_type: "bearer",
          expires_in: 86_400,
          expires_at: expiresAt,
          refresh_token: "e2e-refresh-not-for-production",
          user: {
            id: userId,
            aud: "authenticated",
            role: "authenticated",
            email: "e2e-docs-certs@example.com",
          },
        }),
      );
    },
    { instituteId: E2E_INSTITUTE_ID, userId: E2E_ADMIN_USER_ID },
  );
}

/** Prevent Playwright from hitting hosted Supabase Auth during mocked journeys. */
export async function blockHostedSupabaseAuth(page: Page): Promise<void> {
  await page.route(
    (url) =>
      url.hostname.endsWith("supabase.co") ||
      url.pathname.includes("/auth/v1/"),
    async (route) => {
      const accessToken =
        "eyJhbGciOiJub25lIn0.eyJzdWIiOiJlMmUtZG9jcy1jZXJ0cyIsImV4cCI6OTk5OTk5OTk5OX0.e2e";
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: accessToken,
          token_type: "bearer",
          expires_in: 86_400,
          expires_at: Math.floor(Date.now() / 1000) + 86_400,
          refresh_token: "e2e-refresh-not-for-production",
          user: {
            id: E2E_ADMIN_USER_ID,
            aud: "authenticated",
            role: "authenticated",
            email: "e2e-docs-certs@example.com",
          },
        }),
      });
    },
  );
}

type MockMode = "empty" | "error" | "forbidden" | "loading" | "with-tc-template";

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function mePayload() {
  return {
    user: { id: E2E_ADMIN_USER_ID },
    profile: {
      id: "profile-e2e-docs-certs",
      displayName: "E2E Docs Certs",
      email: "e2e-docs-certs@example.com",
      status: "active",
    },
    institutes: [
      {
        instituteId: E2E_INSTITUTE_ID,
        membershipId: "membership-e2e-docs-certs",
        status: "active",
        roles: ["institute_admin"],
      },
    ],
    platformOperator: { active: false, roleCode: null },
    identities: {
      teachers: [],
      students: [],
      parents: [],
      staff: [],
    },
  };
}

/**
 * Mock Admin `/api/v1/*` as read-only. Non-GET requests are blocked (403) and recorded.
 * Does not call a real backend or Supabase.
 */
export async function mockAdminDocsCertsApi(
  page: Page,
  mode: MockMode = "empty",
): Promise<string[]> {
  const writes: string[] = [];

  await page.route((url) => url.pathname.startsWith("/api/"), async (route) => {
    const request = route.request();
    const method = request.method();
    const pathname = new URL(request.url()).pathname;

    if (method !== "GET" && method !== "HEAD") {
      writes.push(`${method} ${pathname}`);
      await json(route, 403, {
        error: {
          code: "FORBIDDEN",
          message: "E2E safe mock blocked a write",
        },
      });
      return;
    }

    if (pathname === "/api/v1/me") {
      await json(route, 200, { data: mePayload() });
      return;
    }

    if (pathname === "/api/v1/me/access/permissions") {
      await json(route, 200, {
        data: {
          accessRoleId: null,
          accessRoleName: "Institute admin",
          accessRoleSystemKey: "institute_admin",
          permissions: {},
          assignedSectionKeys: [],
          instituteWide: true,
        },
      });
      return;
    }

    if (pathname === "/api/v1/institutes") {
      await json(route, 200, {
        data: [
          {
            id: E2E_INSTITUTE_ID,
            code: "ALPHA",
            name: "Alpha Public School",
            kind: "school",
            status: "active",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
      return;
    }

    if (pathname === `/api/v1/institutes/${E2E_INSTITUTE_ID}`) {
      await json(route, 200, {
        data: {
          id: E2E_INSTITUTE_ID,
          code: "ALPHA",
          name: "Alpha Public School",
          kind: "school",
          status: "active",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      });
      return;
    }

    if (pathname === `/api/v1/institutes/${E2E_INSTITUTE_ID}/settings`) {
      await json(route, 200, {
        data: {
          instituteId: E2E_INSTITUTE_ID,
          timezone: "Asia/Kolkata",
          locale: "en-IN",
          settings: {},
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      });
      return;
    }

    if (pathname === "/api/v1/registrations/me") {
      await json(route, 404, {
        error: { code: "NOT_FOUND", message: "No registration" },
      });
      return;
    }

    // Fail one core checklist source so setup status stays "error" (gate unlocks)
    // instead of ready+incomplete (which redirects modules to /setup).
    if (pathname === "/api/v1/academic-years") {
      await json(route, 500, {
        error: {
          code: "INTERNAL_ERROR",
          message: "E2E: setup checklist soft-unlock",
        },
      });
      return;
    }

    if (pathname === "/api/v1/subscriptions/detail") {
      await json(route, 200, {
        data: {
          instituteId: E2E_INSTITUTE_ID,
          lifecycleStatus: "trial_active",
          writeGate: "open",
        },
      });
      return;
    }

    const isDocsOrCerts =
      pathname.startsWith("/api/v1/documents/") ||
      pathname.startsWith("/api/v1/certificates");

    if (mode === "loading" && isDocsOrCerts) {
      // Delay long enough for the loading shell assertion; never hits a real backend.
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      await json(route, 200, { data: [] });
      return;
    }

    if (mode === "forbidden" && isDocsOrCerts) {
      await json(route, 403, {
        error: {
          code: "FORBIDDEN",
          message: "You do not have access to document templates for this institute.",
        },
      });
      return;
    }

    if (mode === "error" && isDocsOrCerts) {
      await json(route, 500, {
        error: { code: "INTERNAL_ERROR", message: "Mocked documents/certs failure" },
      });
      return;
    }

    if (pathname === "/api/v1/documents/templates") {
      if (mode === "with-tc-template") {
        await json(route, 200, {
          data: [
            {
              id: "ae333333-3333-4333-8333-333333333333",
              ownerScope: "institute",
              instituteId: E2E_INSTITUTE_ID,
              type: "document",
              name: "Transfer Certificate — Board Format",
              description: null,
              category: "transfer_certificate",
              status: "active",
              source: "system",
              version: 1,
              familyId: "ae333333-3333-4333-8333-333333333333",
              previewAspect: "a4",
              layoutMode: "blocks",
              blocks: [],
              visualTheme: null,
              visualFields: null,
              tags: [],
              assetPath: null,
              fileName: null,
              fileByteSize: null,
              fileContentType: null,
              pptxMeta: {},
              createdByUserId: E2E_ADMIN_USER_ID,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
        return;
      }
      await json(route, 200, { data: [] });
      return;
    }

    if (pathname === "/api/v1/documents/generated") {
      await json(route, 200, { data: [] });
      return;
    }

    if (pathname === "/api/v1/certificates") {
      await json(route, 200, { data: [] });
      return;
    }

    if (pathname === "/api/v1/certificates/platform-templates") {
      await json(route, 200, { data: [] });
      return;
    }

    if (pathname === "/api/v1/certificates/recommendations") {
      await json(route, 200, { data: [] });
      return;
    }

    if (pathname.startsWith("/api/v1/students")) {
      await json(route, 200, { data: [] });
      return;
    }

    // Default: benign empty success for other GETs (subscription, modules, etc.)
    await json(route, 200, { data: [] });
  });

  return writes;
}

/** Seed Nexus localStorage PPTX catalog (flag-off source of truth). */
export async function seedNexusLocalCertificateCatalog(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const key = "lumenx.nexus.certificate-templates.v1";
    const now = new Date().toISOString();
    localStorage.setItem(
      key,
      JSON.stringify({
        version: 1,
        categories: [
          {
            id: "academic",
            name: "Academic",
            description: "E2E seeded",
            system: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
        templates: [
          {
            id: "tpl-e2e-local-1",
            familyId: "tpl-e2e-local-1",
            name: "E2E LocalStorage Award",
            categoryId: "academic",
            description: "Seeded for flag-off journey",
            version: 1,
            status: "published",
            createdAt: now,
            updatedAt: now,
            publishedAt: now,
            file: {
              fileName: "e2e-local.pptx",
              format: "pptx",
              sizeBytes: 128,
            },
            targets: [],
            mappings: [],
          },
        ],
      }),
    );
  });
}

/** Mock Connect public verify endpoint (no auth). */
export async function mockConnectVerifyApi(
  page: Page,
  outcome: "valid" | "not_found" | "error",
): Promise<void> {
  await page.route(
    (url) => url.pathname.includes("/api/v1/certificates/public/verify"),
    async (route) => {
      if (outcome === "error") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "INTERNAL_ERROR", message: "Mocked verify failure" },
          }),
        });
        return;
      }
      if (outcome === "not_found") {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "NOT_FOUND", message: "Certificate not found" },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            valid: true,
            instituteId: E2E_INSTITUTE_ID,
            instituteName: "Alpha Public School",
            certificateNumber: "CERT/2026/0001",
            title: "Bonafide Certificate",
            recipientName: "Student A",
            category: "Academic",
            templateName: "Bonafide",
            status: "issued",
            issuedAt: "2026-08-01T00:00:00.000Z",
            revokedAt: null,
            revokeReason: null,
          },
        }),
      });
    },
  );
}
