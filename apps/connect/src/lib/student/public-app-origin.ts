import { buildStudentVerifyUrl } from "@/lib/student/id-card-qr-payload";

const PUBLIC_ORIGIN_KEY = "connect:public-origin";

/** Base URL used in QR codes so other phones can open the profile page. */
export function getPublicAppOrigin(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim().replace(/\/$/, "");

  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem(PUBLIC_ORIGIN_KEY);
  if (stored?.trim()) return stored.trim().replace(/\/$/, "");

  return window.location.origin;
}

export function setPublicAppOrigin(origin: string) {
  localStorage.setItem(PUBLIC_ORIGIN_KEY, origin.trim().replace(/\/$/, ""));
}

export function isLocalDevOrigin(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1";
}

/** Short profile URL for QR — keeps QR generation fast and reliable. */
export function buildStudentQrScanValue(studentId: string, origin = getPublicAppOrigin()): string {
  return buildStudentVerifyUrl(studentId, origin);
}
