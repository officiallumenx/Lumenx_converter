import { describe, expect, it } from "vitest";
import { mapPlatformDtoToCertificateTemplate } from "./platform-dto-map";

describe("mapPlatformDtoToCertificateTemplate", () => {
  it("maps active platform DTO to published catalog template", () => {
    const mapped = mapPlatformDtoToCertificateTemplate({
      id: "ae111111-1111-4111-8111-111111111111",
      familyId: "af111111-1111-4111-8111-111111111111",
      name: "Award",
      description: "Desc",
      category: "academic",
      status: "active",
      source: "custom",
      version: 2,
      layoutMode: "pptx",
      fileName: "award.pptx",
      fileByteSize: 10,
      fileContentType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      assetPath: "platform/x/v2/award.pptx",
      hasFile: true,
      pptxMeta: { format: "pptx", targets: [], mappings: [] },
      createdByUserId: null,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-02T00:00:00.000Z",
    });

    expect(mapped.status).toBe("published");
    expect(mapped.familyId).toBe("af111111-1111-4111-8111-111111111111");
    expect(mapped.file.format).toBe("pptx");
    expect(mapped.categoryId).toBe("academic");
    expect(mapped.file.dataUrl).toBeUndefined();
  });
});
