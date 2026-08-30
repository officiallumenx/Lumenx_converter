import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("documents mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createDocumentTemplate } = await import("./mutations");
    await expect(
      createDocumentTemplate({
        instituteId: INST,
        type: "document",
        name: "TC",
      }),
    ).rejects.toThrow(/API auth mode/);
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
    await createDocumentTemplate(
      { instituteId: INST, type: "certificate", name: "Bonafide" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/documents/templates",
      expect.objectContaining({
        institute_id: INST,
        type: "certificate",
        name: "Bonafide",
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
