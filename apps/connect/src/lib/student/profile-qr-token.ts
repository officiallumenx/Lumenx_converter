import type { StudentIdQrPayload } from "@/lib/student/id-card-qr-payload";

const TOKEN_VERSION = 1;
/** Keep encoded token small enough for reliable QR scans. */
const MAX_TOKEN_JSON_BYTES = 1800;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const padded = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

type TokenShape = {
  v: number;
  i: StudentIdQrPayload["identity"];
  ac: StudentIdQrPayload["academic"];
  pr: StudentIdQrPayload["progressReports"];
  ach: StudentIdQrPayload["achievements"];
  cer: StudentIdQrPayload["certificates"];
  cmp: StudentIdQrPayload["competitions"];
  ex: StudentIdQrPayload["examHistory"];
  att: StudentIdQrPayload["attendance"];
};

function toTokenShape(profile: StudentIdQrPayload): TokenShape {
  return {
    v: TOKEN_VERSION,
    i: profile.identity,
    ac: profile.academic,
    pr: profile.progressReports,
    ach: profile.achievements,
    cer: profile.certificates,
    cmp: profile.competitions,
    ex: profile.examHistory,
    att: profile.attendance,
  };
}

function tokenShapeToPayload(shape: TokenShape, verifyUrl: string): StudentIdQrPayload {
  return {
    v: 2,
    type: "lumenx-student-profile",
    generatedAt: new Date().toISOString(),
    verifyUrl,
    identity: shape.i,
    academic: shape.ac,
    progressReports: shape.pr,
    achievements: shape.ach,
    certificates: shape.cer,
    competitions: shape.cmp,
    examHistory: shape.ex,
    attendance: shape.att,
  };
}

export function encodeStudentProfileToken(profile: StudentIdQrPayload): string | null {
  let shape = toTokenShape(profile);
  let json = JSON.stringify(shape);

  for (let pass = 0; pass < 12; pass++) {
    if (new TextEncoder().encode(json).length <= MAX_TOKEN_JSON_BYTES) {
      return bytesToBase64Url(new TextEncoder().encode(json));
    }
    shape = {
      ...shape,
      pr: shape.pr.slice(0, Math.max(1, shape.pr.length - 1)).map((r) => ({
        ...r,
        subjects: r.subjects.slice(0, Math.max(2, 6 - pass)),
      })),
      ach: shape.ach.slice(0, Math.max(2, shape.ach.length - 1)).map((a) => ({
        title: a.title,
        description: a.description.slice(0, Math.max(20, 80 - pass * 10)),
        tier: a.tier,
        unlockedOn: a.unlockedOn,
      })),
      cer: shape.cer.slice(0, Math.max(1, shape.cer.length - 1)),
      cmp: shape.cmp.slice(0, Math.max(1, shape.cmp.length - 1)),
      ex: shape.ex.slice(0, Math.max(2, shape.ex.length - 1)),
    };
    json = JSON.stringify(shape);
  }

  return null;
}

export function decodeStudentProfileToken(token: string, verifyUrl: string): StudentIdQrPayload | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(token));
    const shape = JSON.parse(json) as TokenShape;
    if (!shape?.i?.studentId || shape.v !== TOKEN_VERSION) return null;
    return tokenShapeToPayload(shape, verifyUrl);
  } catch {
    return null;
  }
}
