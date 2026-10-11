import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { sanitizeFileName } from "../assets/storage.js";
import {
  PLATFORM_CERTIFICATE_TEMPLATE_BUCKET,
  PLATFORM_CERTIFICATE_MAX_BYTES,
  PLATFORM_CERTIFICATE_ALLOWED_CONTENT_TYPES,
} from "./types.js";

const ZIP_LOCAL = [0x50, 0x4b, 0x03, 0x04] as const; // PK\x03\x04
const ZIP_EMPTY = [0x50, 0x4b, 0x05, 0x06] as const; // PK\x05\x06
const ZIP_SPAN = [0x50, 0x4b, 0x07, 0x08] as const; // PK\x07\x08
const OLE_CFB = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] as const;

/** Minimum local-file header size for a non-empty ZIP. */
const MIN_ZIP_LOCAL_BYTES = 30;
/** OLE compound file header length. */
const MIN_OLE_BYTES = 512;

function asBytes(
  input: ArrayBuffer | Uint8Array | Buffer | undefined,
): Uint8Array | null {
  if (input == null) return null;
  if (input instanceof Uint8Array) return input;
  return new Uint8Array(input);
}

function startsWith(bytes: Uint8Array, magic: readonly number[]): boolean {
  if (bytes.byteLength < magic.length) return false;
  for (let i = 0; i < magic.length; i++) {
    if (bytes[i] !== magic[i]) return false;
  }
  return true;
}

function latin1Includes(bytes: Uint8Array, needle: string): boolean {
  if (bytes.byteLength < needle.length) return false;
  const text = Buffer.from(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).toString("latin1");
  return text.includes(needle);
}

function isZipSignature(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, ZIP_LOCAL) ||
    startsWith(bytes, ZIP_EMPTY) ||
    startsWith(bytes, ZIP_SPAN)
  );
}

/**
 * PPTX is OOXML (ZIP). Accept common Office ZIP signatures and require
 * Content_Types plus a ppt/ entry so plain ZIPs / DOCX are rejected.
 */
export function assertPptxContentSignature(bytes: Uint8Array): void {
  if (bytes.byteLength < MIN_ZIP_LOCAL_BYTES) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["File is truncated or not a valid PPTX package"],
    });
  }
  if (!isZipSignature(bytes)) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["File content does not match a PPTX (ZIP/OOXML) package"],
    });
  }
  const hasContentTypes = latin1Includes(bytes, "[Content_Types].xml");
  const hasPptFolder =
    latin1Includes(bytes, "ppt/") || latin1Includes(bytes, "ppt\\");
  if (!hasContentTypes || !hasPptFolder) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["File is not a PowerPoint PPTX package"],
    });
  }
}

/** Legacy .ppt uses OLE Compound File Binary. */
export function assertPptContentSignature(bytes: Uint8Array): void {
  if (bytes.byteLength < MIN_OLE_BYTES) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["File is truncated or not a valid PPT document"],
    });
  }
  if (!startsWith(bytes, OLE_CFB)) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["File content does not match a PPT (OLE) document"],
    });
  }
}

export function assertPlatformCertificateFile(input: {
  fileName: string;
  contentType: string;
  byteSize: number;
  /**
   * When provided (required for upload/import), validates ZIP/OLE magic bytes
   * and OOXML PPTX markers so renamed/truncated payloads are rejected.
   */
  bytes?: ArrayBuffer | Uint8Array | Buffer;
}): { fileName: string; contentType: string; format: "ppt" | "pptx" } {
  const fileName = sanitizeFileName(input.fileName);
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext !== "ppt" && ext !== "pptx") {
    throw AppError.validation("Invalid certificate template file", {
      file: ["PPT or PPTX only"],
    });
  }
  if (
    input.byteSize <= 0 ||
    input.byteSize > PLATFORM_CERTIFICATE_MAX_BYTES
  ) {
    throw AppError.validation("Invalid certificate template file", {
      file: [
        `File must be between 1 byte and ${PLATFORM_CERTIFICATE_MAX_BYTES} bytes`,
      ],
    });
  }
  const contentType = (input.contentType || "").trim().toLowerCase();
  const allowed = new Set<string>(PLATFORM_CERTIFICATE_ALLOWED_CONTENT_TYPES);
  if (contentType && !allowed.has(contentType)) {
    throw AppError.validation("Invalid certificate template file", {
      file: ["Unsupported content type"],
    });
  }

  const bytes = asBytes(input.bytes);
  if (bytes) {
    if (bytes.byteLength !== input.byteSize) {
      throw AppError.validation("Invalid certificate template file", {
        file: ["Declared size does not match file content"],
      });
    }
    if (ext === "pptx") {
      assertPptxContentSignature(bytes);
    } else {
      assertPptContentSignature(bytes);
    }
  }

  return {
    fileName,
    contentType:
      contentType ||
      (ext === "pptx"
        ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        : "application/vnd.ms-powerpoint"),
    format: ext,
  };
}

/** platform/{templateId}/v{version}/{fileName} */
export function buildPlatformTemplateObjectPath(
  templateId: string,
  version: number,
  fileName: string,
): string {
  return `platform/${templateId}/v${version}/${sanitizeFileName(fileName)}`;
}

export async function uploadPlatformTemplateObject(
  admin: SupabaseClient,
  objectPath: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const { error } = await admin.storage
    .from(PLATFORM_CERTIFICATE_TEMPLATE_BUCKET)
    .upload(objectPath, body, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });
  if (error) {
    if (/already exists/i.test(error.message)) {
      throw AppError.conflict("Storage object already exists");
    }
    // Do not leak Storage/provider internals to API clients.
    throw AppError.internal("Storage upload failed", {
      code: "STORAGE_UPLOAD_FAILED",
      message: error.message,
    });
  }
}

export async function createPlatformTemplateSignedUrl(
  admin: SupabaseClient,
  objectPath: string,
  expiresInSec: number,
): Promise<{ signedUrl: string; expiresAt: string }> {
  const { data, error } = await admin.storage
    .from(PLATFORM_CERTIFICATE_TEMPLATE_BUCKET)
    .createSignedUrl(objectPath, expiresInSec);
  if (error || !data?.signedUrl) {
    throw AppError.internal("Failed to create signed URL", {
      code: "STORAGE_SIGNED_URL_FAILED",
      message: error?.message,
    });
  }
  return {
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + expiresInSec * 1000).toISOString(),
  };
}
