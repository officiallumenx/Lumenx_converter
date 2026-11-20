import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";
import {
  buildCurrentRegistrationConsentAssertion,
  validateRegistrationLegalConsent,
} from "./legal-consent.js";
import {
  ADMIN_PRIVACY_VERSION,
  ADMIN_TERMS_VERSION,
  COOKIE_POLICY_VERSION,
  LEGAL_DOCUMENT_IDS,
} from "./legal-document-catalog.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

function readMigration(name: string): string {
  const candidates = [
    join(process.cwd(), "supabase/migrations", name),
    join(process.cwd(), "../supabase/migrations", name),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error(`migration not found: ${name}`);
  return readFileSync(path, "utf8");
}

describe("validateRegistrationLegalConsent", () => {
  const valid = buildCurrentRegistrationConsentAssertion();

  it("rejects missing consent", () => {
    expect(() => validateRegistrationLegalConsent(null)).toThrow(AppError);
    expect(() => validateRegistrationLegalConsent(undefined)).toThrow(AppError);
  });

  it("rejects accepted=false / malformed documents", () => {
    expect(() =>
      validateRegistrationLegalConsent({ accepted: false, documents: valid.documents }),
    ).toThrow(AppError);
    expect(() =>
      validateRegistrationLegalConsent({ accepted: true, documents: "nope" }),
    ).toThrow(AppError);
    expect(() =>
      validateRegistrationLegalConsent({
        accepted: true,
        documents: [{ id: "not_a_doc", version: "2026-09-04" }],
      }),
    ).toThrow(AppError);
    expect(() =>
      validateRegistrationLegalConsent({
        accepted: true,
        documents: [{ id: LEGAL_DOCUMENT_IDS.ADMIN_TERMS, version: "v1" }],
      }),
    ).toThrow(AppError);
  });

  it("rejects when Terms or Privacy is missing", () => {
    expect(() =>
      validateRegistrationLegalConsent({
        accepted: true,
        documents: [ADMIN_TERMS_VERSION],
      }),
    ).toThrow(AppError);
    expect(() =>
      validateRegistrationLegalConsent({
        accepted: true,
        documents: [ADMIN_PRIVACY_VERSION],
      }),
    ).toThrow(AppError);
  });

  it("rejects stale document versions", () => {
    expect(() =>
      validateRegistrationLegalConsent({
        accepted: true,
        documents: [
          { id: ADMIN_TERMS_VERSION.id, version: "2000-01-01" },
          ADMIN_PRIVACY_VERSION,
        ],
      }),
    ).toThrow(AppError);
  });

  it("accepts valid Terms + Privacy and stamps server timestamp", () => {
    const now = new Date("2026-10-23T12:00:00.000Z");
    const result = validateRegistrationLegalConsent(
      {
        accepted: true,
        documents: [ADMIN_TERMS_VERSION, ADMIN_PRIVACY_VERSION],
      },
      { now },
    );
    expect(result.accepted).toBe(true);
    expect(result.acceptedAt).toBe("2026-10-23T12:00:00.000Z");
    expect(result.documents).toEqual([
      ADMIN_TERMS_VERSION,
      ADMIN_PRIVACY_VERSION,
    ]);
    expect(result.action).toBe("registration_accept");
  });

  it("records Terms and Privacy versions correctly (optional Cookie)", () => {
    const result = validateRegistrationLegalConsent(valid, {
      now: new Date("2026-10-23T12:30:00.000Z"),
    });
    expect(result.documents).toEqual([
      ADMIN_TERMS_VERSION,
      ADMIN_PRIVACY_VERSION,
      COOKIE_POLICY_VERSION,
    ]);
    expect(result.documents.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.version))).toBe(
      true,
    );
  });

  it("does not require Cookie Policy for registration", () => {
    const withoutCookie = buildCurrentRegistrationConsentAssertion({
      includeCookiePolicy: false,
    });
    expect(withoutCookie.documents.map((d) => d.id)).not.toContain(
      LEGAL_DOCUMENT_IDS.COOKIE_POLICY,
    );
    expect(() => validateRegistrationLegalConsent(withoutCookie)).not.toThrow();
  });

  it("uses ISO versions aligned with @lumenx/legal lastUpdated (no invented numbers)", async () => {
    const legal = await import("@lumenx/legal");
    expect(ADMIN_TERMS_VERSION).toEqual(legal.ADMIN_TERMS_VERSION);
    expect(ADMIN_PRIVACY_VERSION).toEqual(legal.ADMIN_PRIVACY_VERSION);
    expect(COOKIE_POLICY_VERSION).toEqual(legal.COOKIE_POLICY_VERSION);
    expect(ADMIN_TERMS_VERSION.version).toBe(
      legal.legalVersionFromLastUpdated("4 September 2026"),
    );
  });
});

describe("institute_registration_legal_consent migration / RLS", () => {
  const sql = readMigration(
    "20261023120000_institute_registration_legal_consent.sql",
  );

  it("creates consent table with unique registration+document and version format", () => {
    expect(sql).toContain("CREATE TABLE public.institute_registration_legal_consent");
    expect(sql).toContain("UNIQUE (registration_id, document_id)");
    expect(sql).toContain("accepted_at");
    expect(sql).toContain("document_version");
    expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("restricts SELECT to applicant self + platform operators; no client writes", () => {
    expect(sql).toContain("institute_registration_legal_consent_select_self");
    expect(sql).toContain("r.applicant_user_id = auth.uid()");
    expect(sql).toContain("institute_registration_legal_consent_select_operator");
    expect(sql).toContain("is_platform_operator()");
    expect(sql).toContain("GRANT SELECT ON public.institute_registration_legal_consent TO authenticated");
    expect(sql).toContain(
      "GRANT ALL ON TABLE public.institute_registration_legal_consent TO service_role",
    );
    expect(sql).not.toMatch(/FOR INSERT/);
    expect(sql).not.toMatch(/FOR UPDATE/);
    expect(sql).not.toMatch(/FOR DELETE/);
  });
});
