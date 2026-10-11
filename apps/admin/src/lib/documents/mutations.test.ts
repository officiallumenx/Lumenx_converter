import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("documents mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not call network for invalid UUID on activate", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { activateDocumentTemplate } = await import("./mutations");
    await expect(activateDocumentTemplate("bad", client)).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts template and transitions generated in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createDocumentTemplate, transitionGeneratedDocument } =
      await import("./mutations");
    // Low-level API remains available for Certificates hybrid sync.
    await createDocumentTemplate(
      { instituteId: INST, type: "certificate", name: "Award shadow" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/documents/templates",
      expect.objectContaining({
        institute_id: INST,
        type: "certificate",
        name: "Award shadow",
      }),
    );
    await transitionGeneratedDocument(
      ID,
      { workflowState: "published" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      `/api/v1/documents/generated/${ID}/transition`,
      expect.objectContaining({ workflow_state: "published" }),
    );
  });

  it("Documents hub create allows document/report and rejects certificate", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createDocumentsHubTemplate } = await import("./mutations");

    await createDocumentsHubTemplate(
      {
        instituteId: INST,
        type: "document",
        name: "Transfer Certificate — Board Format",
        category: "transfer_certificate",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/documents/templates",
      expect.objectContaining({
        type: "document",
        name: "Transfer Certificate — Board Format",
        category: "transfer_certificate",
      }),
    );

    await createDocumentsHubTemplate(
      { instituteId: INST, type: "report", name: "Progress Report" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/documents/templates",
      expect.objectContaining({ type: "report", name: "Progress Report" }),
    );

    await expect(
      createDocumentsHubTemplate(
        {
          instituteId: INST,
          // @ts-expect-error Documents hub must not submit certificate
          type: "certificate",
          name: "Should fail",
        },
        client,
      ),
    ).rejects.toThrow(/document and report/i);
    expect(post).toHaveBeenCalledTimes(2);
  });

  it("posts create generated document in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createGeneratedDocument } = await import("./mutations");
    await createGeneratedDocument(
      {
        instituteId: INST,
        templateId: ID,
        recipientName: "Ada Lovelace",
        studentId: ID,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/documents/generated",
      expect.objectContaining({
        institute_id: INST,
        template_id: ID,
        recipient_name: "Ada Lovelace",
        student_id: ID,
      }),
    );
  });
});
