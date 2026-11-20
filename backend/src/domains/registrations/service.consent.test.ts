import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCurrentRegistrationConsentAssertion } from "./legal-consent.js";

const insertRegistrationWithLegalConsent = vi.fn();
const upsertRegistrationLegalConsent = vi.fn();
const listRegistrationLegalConsent = vi.fn();
const findPendingRegistrationByApplicantUserId = vi.fn();
const findRegistrationByApplicantUserId = vi.fn();
const insertUserProfile = vi.fn();
const isPlatformOperatorUser = vi.fn();
const resubmitRegistrationWithLegalConsent = vi.fn();

vi.mock("./repository.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./repository.js")>();
  return {
    ...actual,
    insertRegistrationWithLegalConsent,
    upsertRegistrationLegalConsent,
    listRegistrationLegalConsent,
    findPendingRegistrationByApplicantUserId,
    findRegistrationByApplicantUserId,
    insertUserProfile,
    isPlatformOperatorUser,
    resubmitRegistrationWithLegalConsent,
  };
});

vi.mock("../identity/repository.js", () => ({
  findInstituteByCode: vi.fn().mockResolvedValue(null),
  findProfileById: vi.fn().mockResolvedValue({ id: "user-1", status: "active" }),
}));

vi.mock("../auth-credentials/repository.js", () => ({
  findCredentialByUsername: vi.fn().mockResolvedValue(null),
  upsertUserAuthCredential: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../auth/create-server-session.js", () => ({
  signInPasswordForUserId: vi.fn(),
}));

const fullPayload = {
  instituteName: "Alpha International School",
  instituteCode: "alpha-001",
  instituteType: "School (K-12)",
  educationBoard: "CBSE",
  schoolPhone: "08012345678",
  schoolEmail: "office@school.edu",
  country: "India",
  state: "Karnataka",
  district: "Bengaluru Urban",
  city: "Bengaluru",
  area: "Indiranagar",
  street: "12 Main Road",
  pincode: "560038",
  principalName: "Dr. Ananya Verma",
  principalEmail: "principal@school.edu",
  principalMobile: "+919876543210",
  principalDesignation: "Principal",
  username: "ananya.admin",
  adminCountry: "India",
  adminState: "Karnataka",
  adminDistrict: "Bengaluru Urban",
  adminCity: "Bengaluru",
  adminAddress: "12 Palm Grove, Indiranagar",
  adminPincode: "560038",
};

function mockAdminAuthCreateUser(userId = "user-1") {
  return {
    auth: {
      admin: {
        createUser: vi.fn().mockResolvedValue({
          data: { user: { id: userId } },
          error: null,
        }),
      },
    },
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("createRegistration atomic consent persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPlatformOperatorUser.mockResolvedValue(false);
    findPendingRegistrationByApplicantUserId.mockResolvedValue(null);
    findRegistrationByApplicantUserId.mockResolvedValue(null);
    listRegistrationLegalConsent.mockResolvedValue([]);
    insertUserProfile.mockResolvedValue(undefined);
  });

  it("persists registration+consent via atomic RPC and does not approve", async () => {
    const { createRegistration } = await import("./service.js");
    const consent = buildCurrentRegistrationConsentAssertion();
    const row = {
      id: "reg-1",
      applicant_user_id: "user-1",
      applicant_name: "Dr. Ananya Verma",
      email: "principal@school.edu",
      phone: "+919876543210",
      payload: fullPayload,
      status: "pending" as const,
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      institute_id: null,
      created_at: "2026-10-23T12:00:00.000Z",
      updated_at: "2026-10-23T12:00:00.000Z",
    };
    insertRegistrationWithLegalConsent.mockResolvedValue(row);

    const dto = await createRegistration(mockAdminAuthCreateUser(), {
      applicantName: "Dr. Ananya Verma",
      email: "principal@school.edu",
      password: "SecurePass123",
      phone: "+919876543210",
      pin: "123456",
      payload: fullPayload,
      legalConsent: consent,
    });

    expect(insertRegistrationWithLegalConsent).toHaveBeenCalledOnce();
    expect(insertRegistrationWithLegalConsent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        applicantUserId: "user-1",
        email: "principal@school.edu",
        consent: expect.objectContaining({
          accepted: true,
          action: "registration_accept",
          documents: expect.arrayContaining([
            expect.objectContaining({ id: "admin_terms" }),
            expect.objectContaining({ id: "admin_privacy" }),
          ]),
        }),
      }),
    );
    expect(dto.status).toBe("pending");
    expect(dto.instituteId).toBeNull();
  });

  it("returns error and never succeeds when atomic RPC fails", async () => {
    const { createRegistration } = await import("./service.js");
    insertRegistrationWithLegalConsent.mockRejectedValue(
      new Error("required legal consent documents missing"),
    );

    await expect(
      createRegistration(mockAdminAuthCreateUser(), {
        applicantName: "Dr. Ananya Verma",
        email: "principal@school.edu",
        password: "SecurePass123",
        pin: "123456",
        payload: fullPayload,
        legalConsent: buildCurrentRegistrationConsentAssertion(),
      }),
    ).rejects.toThrow(/consent|missing/i);
  });

  it("rejects create without consent before Auth/registration writes", async () => {
    const { createRegistration } = await import("./service.js");
    const admin = mockAdminAuthCreateUser();
    await expect(
      createRegistration(admin, {
        applicantName: "Dr. Ananya Verma",
        email: "principal@school.edu",
        password: "SecurePass123",
        pin: "123456",
        payload: fullPayload,
        legalConsent: null,
      }),
    ).rejects.toThrow(/consent/i);
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled();
    expect(insertRegistrationWithLegalConsent).not.toHaveBeenCalled();
  });

  it("idempotent pending retry upserts consent without creating a second registration", async () => {
    const { createRegistration } = await import("./service.js");
    findPendingRegistrationByApplicantUserId.mockResolvedValue({
      id: "reg-existing",
      applicant_user_id: "user-1",
      applicant_name: "Dr. Ananya Verma",
      email: "principal@school.edu",
      phone: null,
      payload: fullPayload,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      institute_id: null,
      created_at: "2026-10-23T11:00:00.000Z",
      updated_at: "2026-10-23T11:00:00.000Z",
    });
    listRegistrationLegalConsent.mockResolvedValue([]);
    upsertRegistrationLegalConsent.mockResolvedValue(undefined);

    const dto = await createRegistration(mockAdminAuthCreateUser(), {
      applicantName: "Dr. Ananya Verma",
      email: "principal@school.edu",
      password: "SecurePass123",
      pin: "123456",
      payload: fullPayload,
      legalConsent: buildCurrentRegistrationConsentAssertion(),
    });

    expect(dto.id).toBe("reg-existing");
    expect(insertRegistrationWithLegalConsent).not.toHaveBeenCalled();
    expect(upsertRegistrationLegalConsent).toHaveBeenCalledWith(
      expect.anything(),
      "reg-existing",
      expect.objectContaining({ accepted: true }),
    );
  });

  it("skips consent upsert on pending retry when required docs already present", async () => {
    const { createRegistration } = await import("./service.js");
    findPendingRegistrationByApplicantUserId.mockResolvedValue({
      id: "reg-existing",
      applicant_user_id: "user-1",
      applicant_name: "Dr. Ananya Verma",
      email: "principal@school.edu",
      phone: null,
      payload: fullPayload,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      institute_id: null,
      created_at: "2026-10-23T11:00:00.000Z",
      updated_at: "2026-10-23T11:00:00.000Z",
    });
    listRegistrationLegalConsent.mockResolvedValue([
      {
        id: "c1",
        registration_id: "reg-existing",
        document_id: "admin_terms",
        document_version: "2026-09-04",
        action: "registration_accept",
        accepted_at: "2026-10-23T11:00:00.000Z",
        created_at: "2026-10-23T11:00:00.000Z",
      },
      {
        id: "c2",
        registration_id: "reg-existing",
        document_id: "admin_privacy",
        document_version: "2026-09-04",
        action: "registration_accept",
        accepted_at: "2026-10-23T11:00:00.000Z",
        created_at: "2026-10-23T11:00:00.000Z",
      },
    ]);

    await createRegistration(mockAdminAuthCreateUser(), {
      applicantName: "Dr. Ananya Verma",
      email: "principal@school.edu",
      password: "SecurePass123",
      pin: "123456",
      payload: fullPayload,
      legalConsent: buildCurrentRegistrationConsentAssertion(),
    });

    expect(upsertRegistrationLegalConsent).not.toHaveBeenCalled();
    expect(insertRegistrationWithLegalConsent).not.toHaveBeenCalled();
  });
});
