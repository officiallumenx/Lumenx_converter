/**
 * Deterministic unit coverage for certificate auto-number retry.
 * Mocks repository boundaries only — no shared-environment writes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Actor } from "../src/auth/types.js";
import { AppError } from "../src/errors/app-error.js";
import { issueCertificateForActor } from "../src/domains/certificates/service.js";
import * as certRepo from "../src/domains/certificates/repository.js";
import * as docsRepo from "../src/domains/documents/repository.js";
import * as studentsRepo from "../src/domains/students/repository.js";
import type { IssuedCertificateRow } from "../src/domains/certificates/types.js";

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const TPL_CERT = "ae111111-1111-4111-8111-111111111111";

const actor: Actor = {
  userId: USER_ADMIN,
  profileId: USER_ADMIN,
  displayName: "Admin",
  email: "a@x.com",
  profileStatus: "active",
  memberships: [
    {
      membershipId: MEMBER_ADMIN,
      instituteId: INST_A,
      status: "active",
      roles: ["institute_admin"],
    },
  ],
  isPlatformOperator: false,
  platformRoleCode: null,
  teachers: [],
  students: [],
  parents: [],
  staff: [],
};

function issuedRow(overrides: Partial<IssuedCertificateRow> = {}): IssuedCertificateRow {
  return {
    id: "b0444444-4444-4444-8444-444444444444",
    institute_id: INST_A,
    generated_document_id: null,
    template_id: TPL_CERT,
    student_id: STUDENT_B,
    teacher_id: null,
    certificate_number: "CERT/2026/0003",
    sequence: 3,
    year: 2026,
    title: "Retry issue",
    category: "Academic",
    template_name: "Bonafide Certificate",
    template_version: 1,
    recipient_name: "Student B",
    recipient_ref: null,
    status: "issued",
    issued_at: "2026-08-03T00:00:00.000Z",
    issued_by_user_id: USER_ADMIN,
    revoked_at: null,
    revoked_by_user_id: null,
    revoke_reason: null,
    asset_path: null,
    file_kind: "pptx",
    created_at: "2026-08-03T00:00:00.000Z",
    updated_at: "2026-08-03T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

describe("certificate auto-number retry (mocked)", () => {
  const admin = {} as SupabaseClient;

  beforeEach(() => {
    vi.spyOn(docsRepo, "findTemplateById").mockResolvedValue({
      id: TPL_CERT,
      owner_scope: "institute",
      institute_id: INST_A,
      type: "certificate",
      name: "Bonafide Certificate",
      description: null,
      category: "Academic",
      status: "active",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    } as never);
    vi.spyOn(studentsRepo, "findStudentById").mockResolvedValue({
      id: STUDENT_B,
      institute_id: INST_A,
      deleted_at: null,
    } as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries insert CONFLICT and succeeds on a later attempt", async () => {
    const nextSeq = vi
      .spyOn(certRepo, "nextCertificateSequence")
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    vi.spyOn(certRepo, "findIssuedCertificateByNumber").mockResolvedValue(null);
    const insert = vi
      .spyOn(certRepo, "insertIssuedCertificate")
      .mockRejectedValueOnce(
        AppError.conflict("That item already exists — try a different name"),
      )
      .mockResolvedValueOnce(issuedRow());

    const dto = await issueCertificateForActor(admin, actor, {
      instituteId: INST_A,
      templateId: TPL_CERT,
      studentId: STUDENT_B,
      recipientName: "Student B",
      title: "Retry issue",
      year: 2026,
      metadataOnly: true,
      fileKind: "pptx",
    });

    expect(dto.certificateNumber).toBe("CERT/2026/0003");
    expect(dto.sequence).toBe(3);
    expect(nextSeq).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(2);
    expect(insert.mock.calls[0]?.[1]?.certificateNumber).toBe("CERT/2026/0002");
    expect(insert.mock.calls[1]?.[1]?.certificateNumber).toBe("CERT/2026/0003");
  });

  it("exhausts after five insert CONFLICT attempts", async () => {
    const nextSeq = vi
      .spyOn(certRepo, "nextCertificateSequence")
      .mockResolvedValue(2);
    vi.spyOn(certRepo, "findIssuedCertificateByNumber").mockResolvedValue(null);
    const insert = vi
      .spyOn(certRepo, "insertIssuedCertificate")
      .mockRejectedValue(
        AppError.conflict("That item already exists — try a different name"),
      );

    await expect(
      issueCertificateForActor(admin, actor, {
        instituteId: INST_A,
        templateId: TPL_CERT,
        studentId: STUDENT_B,
        recipientName: "Student B",
        title: "Retry exhaustion",
        year: 2026,
        metadataOnly: true,
        fileKind: "pptx",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });

    expect(nextSeq).toHaveBeenCalledTimes(5);
    expect(insert).toHaveBeenCalledTimes(5);
  });

  it("retries when pre-check finds a colliding auto number then succeeds", async () => {
    const clash = issuedRow({
      id: "b0555555-5555-4555-8555-555555555555",
      certificate_number: "CERT/2026/0002",
      sequence: 2,
      recipient_name: "Prior",
    });
    const nextSeq = vi
      .spyOn(certRepo, "nextCertificateSequence")
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3);
    const findByNumber = vi
      .spyOn(certRepo, "findIssuedCertificateByNumber")
      .mockResolvedValueOnce(clash)
      .mockResolvedValueOnce(null);
    const insert = vi
      .spyOn(certRepo, "insertIssuedCertificate")
      .mockResolvedValueOnce(issuedRow());

    const dto = await issueCertificateForActor(admin, actor, {
      instituteId: INST_A,
      templateId: TPL_CERT,
      studentId: STUDENT_B,
      recipientName: "Student B",
      title: "Pre-check retry",
      year: 2026,
      metadataOnly: true,
      fileKind: "pptx",
    });

    expect(dto.certificateNumber).toBe("CERT/2026/0003");
    expect(nextSeq).toHaveBeenCalledTimes(2);
    expect(findByNumber).toHaveBeenCalledTimes(2);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0]?.[1]?.certificateNumber).toBe("CERT/2026/0003");
  });

  it("fails custom numbers on the first collision without retrying", async () => {
    const clash = issuedRow({
      certificate_number: "CERT/CUSTOM/1",
      sequence: 1,
    });
    const nextSeq = vi
      .spyOn(certRepo, "nextCertificateSequence")
      .mockResolvedValue(99);
    vi.spyOn(certRepo, "findIssuedCertificateByNumber").mockResolvedValue(clash);
    const insert = vi.spyOn(certRepo, "insertIssuedCertificate");

    await expect(
      issueCertificateForActor(admin, actor, {
        instituteId: INST_A,
        templateId: TPL_CERT,
        studentId: STUDENT_B,
        recipientName: "Student B",
        title: "Custom clash",
        year: 2026,
        certificateNumber: "CERT/CUSTOM/1",
        metadataOnly: true,
        fileKind: "pptx",
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
      message: "Certificate number already issued",
    });

    expect(nextSeq).toHaveBeenCalledTimes(1);
    expect(insert).not.toHaveBeenCalled();
  });
});
