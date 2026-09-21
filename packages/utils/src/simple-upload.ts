/**
 * Simplified upload helpers — JPG/JPEG/PNG/PDF only.
 * Images are auto-compressed. No crop / rotate / rename.
 *
 * Profile photos (Admin Photos / ID card) use PROFILE_PHOTO_COMPRESS —
 * see prepareProfilePhotoFile.
 */

export const SIMPLE_UPLOAD_LIMITS = {
  imageBytes: 1 * 1024 * 1024,
  pdfBytes: 1 * 1024 * 1024,
  homeworkBytes: 3 * 1024 * 1024,
} as const;

/**
 * Canonical profile-photo compression (camera/gallery → Storage).
 *
 * Chosen for ID-card + directory avatars without uploading full camera originals:
 * - maxEdge 1200px — sharp enough for ID cards / profile; far smaller than phone photos
 * - maxBytes 800KB — typically 5–20× smaller than a 4–12MB phone JPEG
 * - WebP when the browser canvas supports it; otherwise JPEG
 * - Metadata is dropped by canvas redraw (EXIF not preserved)
 *
 * Backend PROFILE_PHOTO_MAX_BYTES should stay ≥ this target (slack for encoder variance).
 */
export const PROFILE_PHOTO_COMPRESS = {
  maxEdge: 1200,
  quality: 0.82,
  maxBytes: 800 * 1024,
  /** Absolute reject before we even try to decode (protects memory). */
  sourceMaxBytes: 25 * 1024 * 1024,
  preferredMime: "image/webp" as const,
  fallbackMime: "image/jpeg" as const,
} as const;

export type SimpleUploadKind = "image" | "document" | "homework";

export type SimpleUploadValue = {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string;
};

const IMAGE_EXT = [".jpg", ".jpeg", ".png"] as const;
const DOC_EXT = [".jpg", ".jpeg", ".png", ".pdf"] as const;
const PROFILE_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"] as const;

export function simpleUploadAccept(kind: SimpleUploadKind): string {
  if (kind === "image") return "image/jpeg,image/jpg,image/png,.jpg,.jpeg,.png";
  return "image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";
}

export function simpleUploadExtensions(kind: SimpleUploadKind): readonly string[] {
  return kind === "image" ? IMAGE_EXT : DOC_EXT;
}

export function isAllowedSimpleUploadName(fileName: string, kind: SimpleUploadKind): boolean {
  const lower = fileName.trim().toLowerCase();
  return simpleUploadExtensions(kind).some((ext) => lower.endsWith(ext));
}

export function isPdfFile(file: File): boolean {
  return (
    file.type === "application/pdf" || file.name.trim().toLowerCase().endsWith(".pdf")
  );
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const lower = file.name.trim().toLowerCase();
  return IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

function isProfileImageFile(file: File): boolean {
  const mime = file.type.trim().toLowerCase();
  if (
    mime === "image/jpeg" ||
    mime === "image/jpg" ||
    mime === "image/png" ||
    mime === "image/webp"
  ) {
    return true;
  }
  const lower = file.name.trim().toLowerCase();
  return PROFILE_IMAGE_EXT.some((ext) => lower.endsWith(ext));
}

function maxBytesFor(file: File, kind: SimpleUploadKind): number {
  if (kind === "homework") return SIMPLE_UPLOAD_LIMITS.homeworkBytes;
  if (isPdfFile(file)) return SIMPLE_UPLOAD_LIMITS.pdfBytes;
  return SIMPLE_UPLOAD_LIMITS.imageBytes;
}

function formatMb(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}

function canvasSupportsMime(mime: string): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const sample = canvas.toDataURL(mime, 0.5);
    return sample.startsWith(`data:${mime}`);
  } catch {
    return false;
  }
}

/**
 * Compress an image to a data URL under maxBytes (canvas, no deps).
 * Preserves aspect ratio; drops EXIF via redraw. Default output is JPEG.
 */
export function compressImageToDataUrl(
  file: File,
  opts?: {
    maxEdge?: number;
    quality?: number;
    maxBytes?: number;
    /** Output mime — "image/jpeg" (default) or "image/webp". */
    mimeType?: "image/jpeg" | "image/webp";
  },
): Promise<string> {
  const maxEdge = opts?.maxEdge ?? 1600;
  const quality = opts?.quality ?? 0.82;
  const maxBytes = opts?.maxBytes ?? SIMPLE_UPLOAD_LIMITS.imageBytes;
  const mimeType = opts?.mimeType ?? "image/jpeg";
  const headerPrefix = `data:${mimeType};base64,`;

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        let { width, height } = img;
        const scale = Math.min(1, maxEdge / Math.max(width, height));
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas unsupported"));
          return;
        }
        // White fill so transparent PNGs don't go black in JPEG.
        if (mimeType === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }
        ctx.drawImage(img, 0, 0, width, height);

        let q = quality;
        let data = canvas.toDataURL(mimeType, q);
        const approxBytes = () =>
          Math.ceil((data.length - headerPrefix.length) * 0.75);
        while (approxBytes() > maxBytes && q > 0.4) {
          q -= 0.08;
          data = canvas.toDataURL(mimeType, q);
        }
        if (approxBytes() > maxBytes) {
          const tighter = Math.min(1, (maxEdge / Math.max(width, height)) * 0.75);
          width = Math.max(1, Math.round(width * tighter));
          height = Math.max(1, Math.round(height * tighter));
          canvas.width = width;
          canvas.height = height;
          if (mimeType === "image/jpeg") {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, width, height);
          }
          ctx.drawImage(img, 0, 0, width, height);
          q = 0.7;
          data = canvas.toDataURL(mimeType, q);
          while (approxBytes() > maxBytes && q > 0.35) {
            q -= 0.07;
            data = canvas.toDataURL(mimeType, q);
          }
        }
        URL.revokeObjectURL(url);
        if (approxBytes() > maxBytes) {
          reject(
            new Error(`Image must be ${formatMb(maxBytes)} or smaller after compression.`),
          );
          return;
        }
        resolve(data);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const ext = mime === "image/webp" ? ".webp" : ".jpg";
  const base = fileName.replace(/\.[^.]+$/, "") || "photo";
  const safeName = `${base}${ext}`;
  return new File([bytes], safeName, { type: mime });
}

/**
 * Validate → resize → compress a camera/gallery image BEFORE Storage upload.
 * Always returns a new File (WebP or JPEG); never the original bytes.
 */
export async function prepareProfilePhotoFile(file: File): Promise<File> {
  if (!isProfileImageFile(file)) {
    throw new Error("Use JPEG, PNG, or WebP for profile photos.");
  }
  if (file.size <= 0) {
    throw new Error("File is empty");
  }
  if (file.size > PROFILE_PHOTO_COMPRESS.sourceMaxBytes) {
    throw new Error(
      `Image is too large to process (max ${formatMb(PROFILE_PHOTO_COMPRESS.sourceMaxBytes)}).`,
    );
  }

  const preferWebp =
    typeof document !== "undefined" &&
    canvasSupportsMime(PROFILE_PHOTO_COMPRESS.preferredMime);

  const mimeType = preferWebp
    ? PROFILE_PHOTO_COMPRESS.preferredMime
    : PROFILE_PHOTO_COMPRESS.fallbackMime;

  try {
    const dataUrl = await compressImageToDataUrl(file, {
      maxEdge: PROFILE_PHOTO_COMPRESS.maxEdge,
      quality: PROFILE_PHOTO_COMPRESS.quality,
      maxBytes: PROFILE_PHOTO_COMPRESS.maxBytes,
      mimeType,
    });
    return dataUrlToFile(dataUrl, file.name || "photo");
  } catch (err) {
    if (mimeType === PROFILE_PHOTO_COMPRESS.preferredMime) {
      const dataUrl = await compressImageToDataUrl(file, {
        maxEdge: PROFILE_PHOTO_COMPRESS.maxEdge,
        quality: PROFILE_PHOTO_COMPRESS.quality,
        maxBytes: PROFILE_PHOTO_COMPRESS.maxBytes,
        mimeType: PROFILE_PHOTO_COMPRESS.fallbackMime,
      });
      return dataUrlToFile(dataUrl, file.name || "photo");
    }
    throw err;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil(b64.length * 0.75);
}

/**
 * Validate + (for images) compress a picked file into a SimpleUploadValue.
 */
export async function processSimpleUpload(
  file: File,
  kind: SimpleUploadKind,
): Promise<SimpleUploadValue> {
  if (!isAllowedSimpleUploadName(file.name, kind)) {
    throw new Error(
      kind === "image"
        ? "Upload JPG, JPEG, or PNG only."
        : "Upload JPG, JPEG, PNG, or PDF only.",
    );
  }

  const limit = maxBytesFor(file, kind);

  if (isPdfFile(file)) {
    if (file.size > limit) {
      throw new Error(`PDF must be ${formatMb(limit)} or smaller.`);
    }
    const dataUrl = await readFileAsDataUrl(file);
    return {
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      size: file.size,
      dataUrl,
    };
  }

  // Images — auto compress toward limit
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Image is too large to process.");
  }
  const dataUrl = await compressImageToDataUrl(file, {
    maxBytes: limit,
    maxEdge: kind === "image" ? 1280 : 1600,
  });
  const size = dataUrlByteLength(dataUrl);
  if (size > limit) {
    throw new Error(`Image must be ${formatMb(limit)} or smaller after compression.`);
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return {
    fileName: `${base}.jpg`,
    mimeType: "image/jpeg",
    size,
    dataUrl,
  };
}

export function simpleUploadLimitLabel(kind: SimpleUploadKind): string {
  if (kind === "homework") return "JPG, PNG, or PDF · max 3 MB";
  if (kind === "image") return "JPG or PNG · max 1 MB (auto-compressed)";
  return "JPG, PNG, or PDF · images & PDFs max 1 MB";
}

export function profilePhotoCompressLabel(): string {
  const kb = Math.round(PROFILE_PHOTO_COMPRESS.maxBytes / 1024);
  return `JPEG/PNG/WebP · resized to ≤${PROFILE_PHOTO_COMPRESS.maxEdge}px · ~${kb} KB (auto-compressed before upload)`;
}
