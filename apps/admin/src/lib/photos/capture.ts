/**
 * Profile photo pick / capture helpers for Admin Photos.
 * Gallery = native file picker. Camera = capture input or Capacitor Camera on native.
 *
 * Every path runs prepareProfilePhotoFile (resize + compress) BEFORE multipart upload.
 * Limits: see PROFILE_PHOTO_COMPRESS in @lumenx/utils.
 */
import { Capacitor } from "@capacitor/core";
import { prepareProfilePhotoFile } from "@lumenx/utils";

export class PhotoCaptureCancelledError extends Error {
  constructor(message = "Photo capture cancelled") {
    super(message);
    this.name = "PhotoCaptureCancelledError";
  }
}

export class PhotoPermissionDeniedError extends Error {
  constructor(message = "Camera permission denied") {
    super(message);
    this.name = "PhotoPermissionDeniedError";
  }
}

function dataUrlToRawFile(dataUrl: string, fileName: string): File {
  const comma = dataUrl.indexOf(",");
  const header = comma >= 0 ? dataUrl.slice(0, comma) : "";
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = /data:(.*?);/.exec(header)?.[1] ?? "image/jpeg";
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  const safeName = fileName.toLowerCase().endsWith(".jpg")
    ? fileName
    : `${fileName.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
  return new File([bytes], safeName, { type: mime });
}

function pickFileViaInput(opts: {
  accept: string;
  capture?: boolean;
}): Promise<File> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = opts.accept;
    if (opts.capture) input.setAttribute("capture", "environment");
    input.style.display = "none";
    let settled = false;
    const cleanup = () => {
      input.remove();
    };
    input.onchange = () => {
      settled = true;
      const file = input.files?.[0];
      cleanup();
      if (!file) {
        reject(new PhotoCaptureCancelledError());
        return;
      }
      resolve(file);
    };
    // Some browsers fire focus without change on cancel.
    window.addEventListener(
      "focus",
      () => {
        window.setTimeout(() => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(new PhotoCaptureCancelledError());
          }
        }, 600);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}

export async function pickGalleryPhoto(): Promise<File> {
  const file = await pickFileViaInput({
    accept: "image/jpeg,image/jpg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
  });
  return prepareProfilePhotoFile(file);
}

async function takeNativeCameraPhoto(): Promise<File> {
  try {
    const { Camera, CameraResultType, CameraSource } = await import(
      "@capacitor/camera"
    );
    const photo = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });
    if (!photo.dataUrl) {
      throw new PhotoCaptureCancelledError();
    }
    // Native data URL is still re-compressed to PROFILE_PHOTO_COMPRESS limits.
    const raw = dataUrlToRawFile(photo.dataUrl, "camera.jpg");
    return prepareProfilePhotoFile(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel|dismissed/i.test(message)) {
      throw new PhotoCaptureCancelledError(message);
    }
    if (/permission|denied|restricted/i.test(message)) {
      throw new PhotoPermissionDeniedError(message);
    }
    throw err instanceof Error ? err : new Error(message);
  }
}

export async function takeDevicePhoto(): Promise<File> {
  if (Capacitor.isNativePlatform()) {
    return takeNativeCameraPhoto();
  }
  const file = await pickFileViaInput({
    accept: "image/*",
    capture: true,
  });
  return prepareProfilePhotoFile(file);
}

export { prepareProfilePhotoFile };
