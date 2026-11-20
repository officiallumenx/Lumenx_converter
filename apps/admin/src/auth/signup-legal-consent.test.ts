import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIGNUP_CONSENT_CHECKBOX_ID,
  SIGNUP_CONSENT_REQUIRED_MESSAGE,
  SIGNUP_LEGAL_LINKS,
  assertSignupLegalConsent,
  clearSignupFormDraft,
  clearSignupLegalConsent,
  getSignupLegalConsent,
  loadSignupFormDraft,
  recordSignupLegalConsent,
  saveSignupFormDraft,
  signupLegalLinkHrefs,
  validateSignupLegalConsent,
} from "./signup-legal-consent";
import { LEGAL_PUBLIC_ROUTES, isUnauthenticatedAllowedPath } from "./constants";

describe("institute registration legal links", () => {
  it("exposes Privacy Policy, Terms of Service, and Cookie Policy at configured routes", () => {
    expect(SIGNUP_LEGAL_LINKS).toEqual([
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Service" },
      { to: "/cookies", label: "Cookie Policy" },
    ]);
    expect(signupLegalLinkHrefs()).toEqual(["/privacy", "/terms", "/cookies"]);
    expect(LEGAL_PUBLIC_ROUTES).toEqual(["/terms", "/privacy", "/cookies"]);
  });

  it("allows unauthenticated access to legal routes (fixes welcome bounce)", () => {
    for (const path of LEGAL_PUBLIC_ROUTES) {
      expect(isUnauthenticatedAllowedPath(path)).toBe(true);
    }
    expect(isUnauthenticatedAllowedPath("/signup")).toBe(true);
    expect(isUnauthenticatedAllowedPath("/dashboard")).toBe(false);
  });
});

describe("signup legal consent checkbox validation", () => {
  it("is unchecked by default semantics (false → error)", () => {
    expect(validateSignupLegalConsent(false)).toBe(SIGNUP_CONSENT_REQUIRED_MESSAGE);
  });

  it("shows accessible validation message when consent is missing", () => {
    const message = validateSignupLegalConsent(false);
    expect(message).toMatch(/Privacy Policy/);
    expect(message).toMatch(/Terms of Service/);
    expect(message).not.toMatch(/Cookie Policy before/);
    expect(SIGNUP_CONSENT_CHECKBOX_ID).toBe("signup-accept-legal-agreements");
  });

  it("builds registration API consent assertion with Terms + Privacy versions", async () => {
    const { buildRegistrationLegalConsentAssertion } = await import(
      "./signup-legal-consent"
    );
    const assertion = buildRegistrationLegalConsentAssertion();
    expect(assertion.accepted).toBe(true);
    expect(assertion.documents.map((d) => d.id)).toEqual(
      expect.arrayContaining(["admin_terms", "admin_privacy"]),
    );
    for (const doc of assertion.documents) {
      expect(doc.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("allows progress when consent is checked", () => {
    expect(validateSignupLegalConsent(true)).toBeUndefined();
  });

  it("blocks again when consent is unchecked after being selected", () => {
    expect(validateSignupLegalConsent(true)).toBeUndefined();
    expect(validateSignupLegalConsent(false)).toBe(SIGNUP_CONSENT_REQUIRED_MESSAGE);
  });

  it("assertSignupLegalConsent throws without acceptance", () => {
    expect(() => assertSignupLegalConsent(false)).toThrow(SIGNUP_CONSENT_REQUIRED_MESSAGE);
    expect(() => assertSignupLegalConsent(true)).not.toThrow();
  });
});

describe("signup form draft persistence (legal page return)", () => {
  beforeEach(() => {
    clearSignupFormDraft();
    clearSignupLegalConsent();
  });

  it("preserves multi-step form fields across save/load", () => {
    saveSignupFormDraft({
      step: 4,
      s1: { instituteName: "Alpha School", instituteCode: "alpha-001" },
      s2: { city: "Bengaluru" },
      s3: { email: "admin@school.edu", firstName: "Ananya" },
      s4: {
        password: "SecurePass123",
        confirmPassword: "SecurePass123",
        pin: "123456",
        confirmPin: "123456",
        acceptTerms: true,
      },
      mobileGrant: "grant-token",
      maskedOtpDest: "+91••••3210",
    });

    const loaded = loadSignupFormDraft();
    expect(loaded?.step).toBe(4);
    expect(loaded?.s1).toMatchObject({ instituteName: "Alpha School" });
    expect(loaded?.s3).toMatchObject({ email: "admin@school.edu" });
    expect(loaded?.s4).toMatchObject({ acceptTerms: true, pin: "123456" });
    expect(loaded?.mobileGrant).toBe("grant-token");
  });
});

describe("client-side consent recording", () => {
  beforeEach(() => {
    clearSignupLegalConsent();
  });

  it("does not record consent until recordSignupLegalConsent is called", () => {
    expect(getSignupLegalConsent()).toBeNull();
  });

  it("records consent after explicit successful acceptance", () => {
    const record = recordSignupLegalConsent("Principal@School.EDU", "reg-1");
    expect(record.email).toBe("principal@school.edu");
    expect(record.registrationId).toBe("reg-1");
    expect(record.documents).toEqual(
      expect.arrayContaining(["admin_terms", "admin_privacy"]),
    );
    expect(record.acceptedAt).toMatch(/^\d{4}-/);
    expect(getSignupLegalConsent()?.email).toBe("principal@school.edu");
  });

  it("clears consent record on failure path", () => {
    recordSignupLegalConsent("admin@school.edu");
    clearSignupLegalConsent();
    expect(getSignupLegalConsent()).toBeNull();
  });
});

describe("runApiInstituteSignUp consent enforcement", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    clearSignupLegalConsent();
  });

  const baseData = {
    fullName: "Dr. Ananya Verma",
    email: "principal@school.edu",
    phone: "+919876543210",
    role: "principal" as const,
    designation: "Principal",
    password: "SecurePass123",
    confirmPassword: "SecurePass123",
    securityPin: "123456",
    registrationPayload: {
      instituteName: "Alpha International School",
      instituteCode: "alpha-001",
    },
  };

  it("cannot submit without consent — API is not called", async () => {
    const submitRegistration = vi.fn();
    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({ apiSignInWithPassword: vi.fn() }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");
    await expect(
      runApiInstituteSignUp({ ...baseData, acceptTerms: false }),
    ).rejects.toThrow(SIGNUP_CONSENT_REQUIRED_MESSAGE);
    expect(submitRegistration).not.toHaveBeenCalled();
    expect(getSignupLegalConsent()).toBeNull();
  });

  it("does not record consent when registration submission fails", async () => {
    const submitRegistration = vi.fn().mockRejectedValue(new Error("Email already exists"));
    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({ apiSignInWithPassword: vi.fn() }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");
    await expect(
      runApiInstituteSignUp({ ...baseData, acceptTerms: true }),
    ).rejects.toThrow("Email already exists");
    expect(getSignupLegalConsent()).toBeNull();
  });

  it("records consent after successful submission when acceptTerms is true", async () => {
    const submitRegistration = vi.fn().mockResolvedValue({
      id: "reg-1",
      status: "pending",
      payload: baseData.registrationPayload,
      createdAt: "2024-06-01T08:00:00Z",
      applicantUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      applicantName: baseData.fullName,
      email: baseData.email,
      phone: baseData.phone,
      reviewedBy: null,
      reviewedAt: null,
      rejectionReason: null,
      instituteId: null,
      updatedAt: "2024-06-01T08:00:00Z",
    });
    const apiSignInWithPassword = vi.fn().mockResolvedValue({
      user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: baseData.email },
      meInstitutes: [],
      activeInstituteId: null,
    });
    vi.doMock("@/lib/registrations/api", () => ({ submitRegistration }));
    vi.doMock("./api-auth", () => ({ apiSignInWithPassword }));

    const { runApiInstituteSignUp } = await import("./api-signup-flow");
    // Same module instance as the flow under test (vi.resetModules isolates memory store).
    const { getSignupLegalConsent: getConsent } = await import("./signup-legal-consent");
    await runApiInstituteSignUp({ ...baseData, acceptTerms: true });

    expect(submitRegistration).toHaveBeenCalledOnce();
    expect(submitRegistration.mock.calls[0]?.[0]?.legalConsent).toEqual(
      expect.objectContaining({
        accepted: true,
        documents: expect.arrayContaining([
          expect.objectContaining({ id: "admin_terms" }),
          expect.objectContaining({ id: "admin_privacy" }),
        ]),
      }),
    );
    expect(getConsent()?.email).toBe("principal@school.edu");
  });
});
