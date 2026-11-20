import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildCurrentRegistrationConsentAssertion } from "./legal-consent.js";

function readMigration(name: string): string {
  const candidates = [
    join(process.cwd(), "supabase/migrations", name),
    join(process.cwd(), "../supabase/migrations", name),
  ];
  const path = candidates.find((p) => existsSync(p));
  if (!path) throw new Error(`migration not found: ${name}`);
  return readFileSync(path, "utf8");
}

describe("atomic registration+consent migration SQL", () => {
  const sql = readMigration(
    "20261023140000_institute_registration_consent_atomic.sql",
  );

  it("defines create/resubmit RPCs as SECURITY DEFINER with service_role-only EXECUTE", () => {
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.create_institute_registration_with_legal_consent",
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.resubmit_institute_registration_with_legal_consent",
    );
    expect(sql).toContain(
      "CREATE OR REPLACE FUNCTION public.upsert_institute_registration_legal_consent",
    );
    expect(sql).toMatch(/SECURITY DEFINER/);
    expect(sql).toContain("REVOKE ALL ON FUNCTION public.create_institute_registration_with_legal_consent");
    expect(sql).toContain("FROM PUBLIC, anon, authenticated");
    expect(sql).toContain(
      "GRANT EXECUTE ON FUNCTION public.create_institute_registration_with_legal_consent",
    );
    expect(sql).toContain("TO service_role");
  });

  it("requires admin_terms and admin_privacy inside the write helper", () => {
    expect(sql).toContain("required legal consent documents missing");
    expect(sql).toContain("admin_terms");
    expect(sql).toContain("admin_privacy");
    expect(sql).toContain("ON CONFLICT (registration_id, document_id) DO UPDATE");
  });

  it("creates registration then consent in one plpgsql body (implicit transaction)", () => {
    const createFn = sql.slice(
      sql.indexOf("create_institute_registration_with_legal_consent"),
    );
    expect(createFn).toContain("INSERT INTO public.institute_registration");
    expect(createFn).toContain(
      "PERFORM public._institute_registration_write_legal_consent",
    );
  });
});

describe("insertRegistrationWithLegalConsent RPC wiring", () => {
  it("calls create_institute_registration_with_legal_consent with consent docs", async () => {
    const consent = buildCurrentRegistrationConsentAssertion();
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          id: "reg-1",
          applicant_user_id: "user-1",
          applicant_name: "A",
          email: "a@b.com",
          phone: null,
          payload: { instituteName: "X" },
          status: "pending",
          reviewed_by: null,
          reviewed_at: null,
          rejection_reason: null,
          institute_id: null,
          created_at: "2026-10-23T12:00:00.000Z",
          updated_at: "2026-10-23T12:00:00.000Z",
        },
      ],
      error: null,
    });
    const admin = { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { insertRegistrationWithLegalConsent } = await import("./repository.js");

    const row = await insertRegistrationWithLegalConsent(admin, {
      applicantUserId: "user-1",
      applicantName: "Dr. Ananya",
      email: "principal@school.edu",
      phone: "+919876543210",
      payload: {
        instituteName: "Alpha",
        instituteCode: "alpha-001",
        instituteType: "School (K-12)",
        educationBoard: "CBSE",
        schoolPhone: "08012345678",
        schoolEmail: "office@school.edu",
        country: "India",
        state: "KA",
        district: "BLR",
        city: "Bengaluru",
        area: "Indiranagar",
        street: "12 Main",
        pincode: "560038",
        principalName: "Dr. Ananya",
        principalEmail: "principal@school.edu",
        principalMobile: "+919876543210",
        principalDesignation: "Principal",
        username: "ananya.admin",
        adminCountry: "India",
        adminState: "KA",
        adminDistrict: "BLR",
        adminCity: "Bengaluru",
        adminAddress: "12 Palm",
        adminPincode: "560038",
      },
      consent: {
        accepted: true,
        action: "registration_accept",
        acceptedAt: "2026-10-23T12:00:00.000Z",
        documents: consent.documents,
      },
    });

    expect(row.id).toBe("reg-1");
    expect(rpc).toHaveBeenCalledWith(
      "create_institute_registration_with_legal_consent",
      expect.objectContaining({
        p_applicant_user_id: "user-1",
        p_email: "principal@school.edu",
        p_consent_action: "registration_accept",
        p_accepted_at: "2026-10-23T12:00:00.000Z",
        p_consent_documents: expect.arrayContaining([
          expect.objectContaining({ id: "admin_terms" }),
          expect.objectContaining({ id: "admin_privacy" }),
        ]),
      }),
    );
  });

  it("fails closed when RPC returns an error (no silent non-atomic fallback)", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PGRST202", message: "Could not find the function" },
    });
    const admin = { rpc } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { insertRegistrationWithLegalConsent } = await import("./repository.js");

    await expect(
      insertRegistrationWithLegalConsent(admin, {
        applicantUserId: "user-1",
        applicantName: "A",
        email: "a@b.com",
        payload: { instituteName: "X" },
        consent: {
          accepted: true,
          action: "registration_accept",
          acceptedAt: "2026-10-23T12:00:00.000Z",
          documents: buildCurrentRegistrationConsentAssertion().documents,
        },
      }),
    ).rejects.toBeTruthy();
  });
});
