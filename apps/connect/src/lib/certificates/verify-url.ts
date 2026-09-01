import { getPublicAppOrigin } from "@/lib/student/public-app-origin";

export function buildCertificateVerifyUrl(
  origin: string,
  instituteId: string,
  certificateNumber: string,
): string {
  const base = (origin || getPublicAppOrigin()).replace(/\/+$/, "");
  const query = new URLSearchParams({
    institute_id: instituteId,
    number: certificateNumber,
  });
  return `${base}/verify-certificate?${query.toString()}`;
}

export function parseCertificateVerifyUrl(raw: string): {
  instituteId: string;
  certificateNumber: string;
} | null {
  try {
    const url = raw.startsWith("http") ? new URL(raw) : new URL(raw, getPublicAppOrigin());
    if (!url.pathname.endsWith("/verify-certificate")) return null;
    const instituteId = url.searchParams.get("institute_id")?.trim();
    const certificateNumber = url.searchParams.get("number")?.trim();
    if (!instituteId || !certificateNumber) return null;
    return { instituteId, certificateNumber };
  } catch {
    return null;
  }
}
