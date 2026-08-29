import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("certificates mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses issue in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { issueCertificate } = await import("./mutations");
    await expect(
      issueCertificate({ instituteId: INST, title: "Merit" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid UUID on revoke", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { revokeCertificate } = await import("./mutations");
    await expect(
      revokeCertificate("bad", { reason: "error" }, client),
    ).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts issue and revoke in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { issueCertificate, revokeCertificate } = await import("./mutations");
    await issueCertificate(
      {
        instituteId: INST,
        templateId: ID,
        recipientName: "Aanya",
        title: "Merit",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/certificates",
      expect.objectContaining({
        institute_id: INST,
        template_id: ID,
        recipient_name: "Aanya",
      }),
    );
    await revokeCertificate(ID, { reason: "Duplicate issue" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/certificates/${ID}/revoke`,
      expect.objectContaining({ reason: "Duplicate issue" }),
    );
  });
});
