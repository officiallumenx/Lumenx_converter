/**
 * Save a file to the device Downloads folder (browser download).
 *
 * - Does not create an in-app Downloads page or library.
 * - Does not persist a second copy in localStorage / IndexedDB.
 * - Creates a temporary object URL, triggers download, then revokes it.
 */

export type DeviceDownloadInput = {
  /** Suggested filename including extension (e.g. receipt.txt, report.csv). */
  filename: string;
  /** Plain text, CSV, HTML, etc. Prefer `blob` or `dataUrl` for binary. */
  text?: string;
  blob?: Blob;
  /** data: URL (e.g. image or PDF). */
  dataUrl?: string;
  mimeType?: string;
};

function sanitizeFilename(name: string): string {
  const trimmed = name.trim() || "download";
  return trimmed.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180);
}

/**
 * Trigger a device download. Safe to call from UI click handlers.
 * No-op when `document` is unavailable (SSR).
 */
export function downloadToDevice(input: DeviceDownloadInput): { filename: string } {
  const filename = sanitizeFilename(input.filename);
  if (typeof document === "undefined") return { filename };

  let objectUrl: string | null = null;
  let href: string;

  if (input.dataUrl) {
    href = input.dataUrl;
  } else if (input.blob) {
    objectUrl = URL.createObjectURL(input.blob);
    href = objectUrl;
  } else if (input.text != null) {
    const blob = new Blob([input.text], {
      type: input.mimeType ?? "text/plain;charset=utf-8",
    });
    objectUrl = URL.createObjectURL(blob);
    href = objectUrl;
  } else {
    throw new Error("downloadToDevice requires text, blob, or dataUrl");
  }

  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  if (objectUrl) {
    // Defer revoke so the browser can start the download
    window.setTimeout(() => URL.revokeObjectURL(objectUrl!), 2_000);
  }

  return { filename };
}

/** Convenience: download UTF-8 text / CSV / HTML. */
export function downloadTextToDevice(
  filename: string,
  text: string,
  mimeType = "text/plain;charset=utf-8",
): { filename: string } {
  return downloadToDevice({ filename, text, mimeType });
}

/** Convenience: download a Blob (PDF, image, xlsx, etc.). */
export function downloadBlobToDevice(filename: string, blob: Blob): { filename: string } {
  return downloadToDevice({ filename, blob });
}

/** Convenience: download from a data URL without storing it again in-app. */
export function downloadDataUrlToDevice(filename: string, dataUrl: string): { filename: string } {
  return downloadToDevice({ filename, dataUrl });
}
