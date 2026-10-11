import { describe, expect, it } from "vitest";
import { AppError } from "../src/errors/app-error.js";
import {
  assertPlatformCertificateFile,
  buildPlatformTemplateObjectPath,
  uploadPlatformTemplateObject,
} from "../src/domains/platform-certificate-templates/storage.js";
import { PLATFORM_CERTIFICATE_MAX_BYTES } from "../src/domains/platform-certificate-templates/types.js";
import {
  makeDocxLikeZipBytes,
  makeMinimalPptBytes,
  makeMinimalPptxBytes,
} from "./helpers/minimal-pptx.js";

function expectValidation(fn: () => void) {
  try {
    fn();
    expect.fail("expected validation error");
  } catch (err) {
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(400);
  }
}

describe("platform certificate template file validation", () => {
  it("accepts a valid minimal PPTX (ZIP/OOXML) package", () => {
    const bytes = makeMinimalPptxBytes();
    const checked = assertPlatformCertificateFile({
      fileName: "Award Deck.PPTX",
      contentType: "",
      byteSize: bytes.byteLength,
      bytes,
    });
    expect(checked.format).toBe("pptx");
    expect(checked.fileName.toLowerCase()).toContain(".pptx");
    expect(checked.contentType).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
  });

  it("accepts legacy ppt OLE signature with powerpoint MIME", () => {
    const bytes = makeMinimalPptBytes();
    const checked = assertPlatformCertificateFile({
      fileName: "legacy.ppt",
      contentType: "application/vnd.ms-powerpoint",
      byteSize: bytes.byteLength,
      bytes,
    });
    expect(checked.format).toBe("ppt");
  });

  it("rejects wrong extension and unsupported MIME", () => {
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "notes.pdf",
        contentType: "application/pdf",
        byteSize: 10,
      }),
    );
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "award.pptx",
        contentType: "text/plain",
        byteSize: 32,
      }),
    );
  });

  it("rejects empty, oversized, and size-mismatch files", () => {
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "empty.pptx",
        contentType: "application/octet-stream",
        byteSize: 0,
      }),
    );
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "huge.pptx",
        contentType: "application/octet-stream",
        byteSize: PLATFORM_CERTIFICATE_MAX_BYTES + 1,
      }),
    );
    const bytes = makeMinimalPptxBytes();
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "award.pptx",
        contentType: "application/octet-stream",
        byteSize: bytes.byteLength + 1,
        bytes,
      }),
    );
  });

  it("rejects truncated ZIP, non-ZIP content, and non-PPTX ZIPs", () => {
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "tiny.pptx",
        contentType: "application/octet-stream",
        byteSize: 4,
        bytes: Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      }),
    );
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "fake.pptx",
        contentType: "application/octet-stream",
        byteSize: 32,
        bytes: Buffer.from("%PDF-1.4 not a zip package!!!!"),
      }),
    );
    const docx = makeDocxLikeZipBytes();
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "word.pptx",
        contentType: "application/octet-stream",
        byteSize: docx.byteLength,
        bytes: docx,
      }),
    );
  });

  it("rejects pptx extension with OLE bytes and ppt with ZIP bytes", () => {
    const ole = makeMinimalPptBytes();
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "misnamed.pptx",
        contentType: "application/octet-stream",
        byteSize: ole.byteLength,
        bytes: ole,
      }),
    );
    const zip = makeMinimalPptxBytes();
    expectValidation(() =>
      assertPlatformCertificateFile({
        fileName: "misnamed.ppt",
        contentType: "application/vnd.ms-powerpoint",
        byteSize: zip.byteLength,
        bytes: zip,
      }),
    );
  });

  it("allows metadata-only checks without bytes (upload path supplies bytes)", () => {
    const checked = assertPlatformCertificateFile({
      fileName: "pending.pptx",
      contentType: "application/octet-stream",
      byteSize: 128,
    });
    expect(checked.format).toBe("pptx");
  });

  it("builds versioned private object paths under platform/", () => {
    const path = buildPlatformTemplateObjectPath(
      "ae111111-1111-4111-8111-111111111111",
      3,
      "My Award.pptx",
    );
    expect(path).toMatch(
      /^platform\/ae111111-1111-4111-8111-111111111111\/v3\//,
    );
    expect(path.toLowerCase()).toContain(".pptx");
    expect(path).not.toContain("..");
  });

  it("maps storage already-exists and generic failures to AppError", async () => {
    const conflictAdmin = {
      storage: {
        from: () => ({
          upload: async () => ({
            data: null,
            error: { message: "The resource already exists" },
          }),
        }),
      },
    };
    await expect(
      uploadPlatformTemplateObject(
        conflictAdmin as never,
        "platform/x/v1/a.pptx",
        new ArrayBuffer(8),
        "application/octet-stream",
      ),
    ).rejects.toMatchObject({ status: 409 });

    const failAdmin = {
      storage: {
        from: () => ({
          upload: async () => ({
            data: null,
            error: { message: "network down" },
          }),
        }),
      },
    };
    await expect(
      uploadPlatformTemplateObject(
        failAdmin as never,
        "platform/x/v1/a.pptx",
        new ArrayBuffer(8),
        "application/octet-stream",
      ),
    ).rejects.toMatchObject({
      status: 500,
      message: "Storage upload failed",
    });
  });
});
