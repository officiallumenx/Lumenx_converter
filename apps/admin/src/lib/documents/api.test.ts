import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { DocumentTemplateDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("documents api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists document templates with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listDocumentTemplates } = await import("./api");
    const payload: DocumentTemplateDto[] = [
      {
        id: "ee111111-1111-4111-8111-111111111111",
        ownerScope: "institute",
        instituteId: INST,
        type: "document",
        name: "Bonafide",
        description: null,
        category: "official",
        status: "active",
        source: "custom",
        version: 1,
        previewAspect: "a4",
        layoutMode: "blocks",
        blocks: [],
        visualTheme: null,
        visualFields: null,
        tags: [],
        createdByUserId: null,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listDocumentTemplates({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/documents/templates?");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("lists generated with workflow_state filter", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listGeneratedDocuments } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await listGeneratedDocuments(
      { instituteId: INST, workflowState: "published" },
      client,
    );
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("workflow_state=published");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("refuses list in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listGeneratedDocuments } = await import("./api");
    await expect(
      listGeneratedDocuments({ instituteId: INST }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("gets generated document signed url", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getGeneratedDocumentSignedUrl } = await import("./api");
    const genId = "dd111111-1111-4111-8111-111111111111";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          data: { signedUrl: "https://cdn.test/doc.pdf", expiresAt: "2026-01-01T00:00:00Z" },
        }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await getGeneratedDocumentSignedUrl(genId, 3600, client);
    expect(result.signedUrl).toContain("doc.pdf");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/api/v1/documents/generated/${genId}/signed-url`);
    expect(url).toContain("expires_in=3600");
  });
});
