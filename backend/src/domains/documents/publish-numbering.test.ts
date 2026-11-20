import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Actor } from "../../auth/types.js";
import { AppError } from "../../errors/app-error.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "../../../tests/helpers/mock-supabase.js";
import { resetEnvCache } from "../../config/env.js";

const persistInstitutePdfAsset = vi.fn();

vi.mock("./persist-file.js", () => ({
  persistInstitutePdfAsset: (...args: unknown[]) =>
    persistInstitutePdfAsset(...args),
  resolveLinkedAssetSignedUrl: vi.fn(),
}));

vi.mock("./render-pdf.js", () => ({
  renderDocumentPdf: () => new Uint8Array([37, 80, 68, 70]),
}));

vi.mock("../notifications/service.js", () => ({
  emitNotificationForInstitute: vi.fn().mockResolvedValue({ id: "n1" }),
  emitNotificationForInstituteSystem: vi.fn().mockResolvedValue({ id: "n1" }),
}));

import * as repository from "./repository.js";
import {
  republishGeneratedForActor,
  transitionGeneratedForActor,
} from "./service.js";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "11111111-1111-4111-8111-111111111111";
const TPL = "ae111111-1111-4111-8111-111111111111";
const GEN = "af111111-1111-4111-8111-111111111111";
const GEN_PUB = "af222222-2222-4222-8222-222222222222";
const GEN_SOFT = "af333333-3333-4333-8333-333333333333";

const adminActor: Actor = {
  userId: USER,
  profileId: USER,
  displayName: "Admin",
  email: "a@x.com",
  profileStatus: "active",
  memberships: [
    {
      membershipId: "m1",
      instituteId: INST,
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

function seedDb(overrides?: {
  draftNumber?: string | null;
  includeSoftDeleted?: boolean;
}): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST,
      code: "A",
      name: "A",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.template = [
    {
      id: TPL,
      owner_scope: "institute",
      institute_id: INST,
      type: "certificate",
      name: "Bonafide",
      description: null,
      category: "bonafide",
      status: "active",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.generated_document = [
    {
      id: GEN,
      institute_id: INST,
      template_id: TPL,
      type: "certificate",
      title: "Draft",
      student_id: null,
      teacher_id: null,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "ready",
      workflow_state: "draft",
      certificate_number: overrides?.draftNumber ?? null,
      portal_student: false,
      portal_parent: false,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER,
      published_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: GEN_PUB,
      institute_id: INST,
      template_id: TPL,
      type: "certificate",
      title: "Published",
      student_id: null,
      teacher_id: null,
      recipient_name: "Student B",
      recipient_ref: "STU-B",
      status: "ready",
      workflow_state: "published",
      certificate_number: "DOC/2026/0100",
      portal_student: true,
      portal_parent: true,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: `${INST}/x/${GEN_PUB}.pdf`,
      generated_by_user_id: USER,
      published_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  if (overrides?.includeSoftDeleted) {
    db.generated_document.push({
      id: GEN_SOFT,
      institute_id: INST,
      template_id: TPL,
      type: "certificate",
      title: "Soft-deleted reserved",
      student_id: null,
      teacher_id: null,
      recipient_name: "Gone",
      recipient_ref: null,
      status: "ready",
      workflow_state: "published",
      certificate_number: "DOC/2026/0001",
      portal_student: false,
      portal_parent: false,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER,
      published_at: "2026-07-01T00:00:00.000Z",
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-02T00:00:00.000Z",
      deleted_at: "2026-07-02T00:00:00.000Z",
    });
  }
  return db;
}

describe("publish numbering — stamp, gaps, legacy, soft-delete", () => {
  beforeEach(() => {
    resetEnvCache();
    vi.restoreAllMocks();
    persistInstitutePdfAsset.mockReset();
    persistInstitutePdfAsset.mockResolvedValue({
      objectPath: `${INST}/file.pdf`,
      assetId: "aaaaaaaa-aaaa-4aaa-8aaa-ffffffffffff",
    });
  });

  it("stamps a number before PDF work; failure leaves number reserved on draft", async () => {
    const db = seedDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    persistInstitutePdfAsset.mockRejectedValueOnce(new Error("storage down"));

    await expect(
      transitionGeneratedForActor(admin, adminActor, GEN, {
        workflowState: "published",
      }),
    ).rejects.toThrow(/storage down/);

    const draft = db.generated_document.find((r) => r.id === GEN)!;
    expect(draft.workflow_state).toBe("draft");
    expect(draft.certificate_number).toMatch(/^DOC\/\d{4}\/\d+$/);
    const stamped = draft.certificate_number as string;

    // Retry reuses stamped number (gap policy: allocation already consumed).
    persistInstitutePdfAsset.mockResolvedValue({
      objectPath: `${INST}/file.pdf`,
      assetId: "aaaaaaaa-aaaa-4aaa-8aaa-ffffffffffff",
    });
    const published = await transitionGeneratedForActor(admin, adminActor, GEN, {
      workflowState: "published",
    });
    expect(published.workflowState).toBe("published");
    expect(published.certificateNumber).toBe(stamped);
    expect(db.generated_document.find((r) => r.id === GEN)?.certificate_number).toBe(
      stamped,
    );
  });

  it("fails closed when RPC is unavailable and max fallback is disabled", async () => {
    const prev = process.env.DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK;
    process.env.DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK = "false";
    resetEnvCache();
    try {
      const db = seedDb();
      const { admin } = createMockSupabaseClients({ db, tokens: {} });
      await expect(
        transitionGeneratedForActor(admin, adminActor, GEN, {
          workflowState: "published",
        }),
      ).rejects.toMatchObject({ status: 500 });
      expect(db.generated_document.find((r) => r.id === GEN)?.certificate_number).toBeNull();
      expect(persistInstitutePdfAsset).not.toHaveBeenCalled();
    } finally {
      if (prev === undefined) delete process.env.DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK;
      else process.env.DOCUMENT_NUMBER_ALLOW_MAX_FALLBACK = prev;
      resetEnvCache();
    }
  });

  it("does not treat non-unique failures as number collisions for retry", async () => {
    const db = seedDb({ draftNumber: "DOC/2026/0077" });
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const realUpdate = repository.updateGeneratedDocumentFields.bind(repository);
    const spy = vi
      .spyOn(repository, "updateGeneratedDocumentFields")
      .mockImplementation(async (client, id, patch) => {
        if (patch.workflow_state === "published") {
          throw new Error("connection refused");
        }
        return realUpdate(client, id, patch);
      });
    try {
      await expect(
        transitionGeneratedForActor(admin, adminActor, GEN, {
          workflowState: "published",
        }),
      ).rejects.toThrow(/connection refused/);
      expect(db.generated_document.find((r) => r.id === GEN)?.certificate_number).toBe(
        "DOC/2026/0077",
      );
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects publish when a stamped legacy number is malformed", async () => {
    const db = seedDb({ draftNumber: "CERT-1" });
    const { admin } = createMockSupabaseClients({ db, tokens: {} });

    await expect(
      transitionGeneratedForActor(admin, adminActor, GEN, {
        workflowState: "published",
      }),
    ).rejects.toMatchObject({
      status: 400,
    });
    expect(db.generated_document.find((r) => r.id === GEN)?.certificate_number).toBe(
      "CERT-1",
    );
    expect(persistInstitutePdfAsset).not.toHaveBeenCalled();
  });

  it("preserves a valid stamped number on publish (no reallocation)", async () => {
    const db = seedDb({ draftNumber: "DOC/2026/0077" });
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const published = await transitionGeneratedForActor(admin, adminActor, GEN, {
      workflowState: "published",
    });
    expect(published.certificateNumber).toBe("DOC/2026/0077");
  });

  it("republish preserves historical number and rejects inventing one", async () => {
    const db = seedDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const again = await republishGeneratedForActor(admin, adminActor, GEN_PUB, {
      notify: false,
    });
    expect(again.certificateNumber).toBe("DOC/2026/0100");

    const missing = db.generated_document.find((r) => r.id === GEN_PUB)!;
    missing.certificate_number = null;
    await expect(
      republishGeneratedForActor(admin, adminActor, GEN_PUB, { notify: false }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("max+1 fallback skips soft-deleted reserved numbers (no reuse)", async () => {
    const db = seedDb({ includeSoftDeleted: true });
    // Also clear the published sibling number so sequence is driven by soft-deleted 0001.
    const pub = db.generated_document.find((r) => r.id === GEN_PUB)!;
    pub.certificate_number = "DOC/2025/0001";
    const { admin } = createMockSupabaseClients({ db, tokens: {} });

    const published = await transitionGeneratedForActor(admin, adminActor, GEN, {
      workflowState: "published",
    });
    const year = new Date().getUTCFullYear();
    expect(published.certificateNumber).toBe(
      `DOC/${year}/0002`,
    );
  });

  it("retries publish after unique number conflict and does not leave a half-published row", async () => {
    const db = seedDb();
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const realUpdate = repository.updateGeneratedDocumentFields.bind(repository);
    let finalPublishAttempts = 0;
    vi.spyOn(repository, "updateGeneratedDocumentFields").mockImplementation(
      async (client, id, patch) => {
        if (patch.workflow_state === "published") {
          finalPublishAttempts += 1;
          if (finalPublishAttempts === 1) {
            throw new Error(
              'duplicate key value violates unique constraint "generated_document_institute_number_uidx"',
            );
          }
        }
        return realUpdate(client, id, patch);
      },
    );

    const published = await transitionGeneratedForActor(admin, adminActor, GEN, {
      workflowState: "published",
    });
    expect(published.workflowState).toBe("published");
    expect(published.certificateNumber).toMatch(/^DOC\/\d{4}\/\d+$/);
    expect(finalPublishAttempts).toBeGreaterThanOrEqual(2);
    expect(db.generated_document.find((r) => r.id === GEN)?.workflow_state).toBe(
      "published",
    );
  });
});
