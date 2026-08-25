/**
 * Activity Teacher → Admin: certificate recommendations from achievements.
 */

export const CERTIFICATE_RECOMMENDATIONS_KEY = "lumenx.certificate-recommendations.v1";

export type CertificateRecommendationStatus = "pending" | "issued" | "dismissed";

export type CertificateRecommendation = {
  id: string;
  achievementId: string;
  achievementTitle: string;
  achievementType: string;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  recommendedBy: string;
  recommendedAt: string;
  status: CertificateRecommendationStatus;
  issuedAt?: string;
  note?: string;
};

function readAll(): CertificateRecommendation[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CERTIFICATE_RECOMMENDATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CertificateRecommendation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(rows: CertificateRecommendation[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CERTIFICATE_RECOMMENDATIONS_KEY, JSON.stringify(rows.slice(0, 200)));
  } catch {
    // Ignore quota / private mode.
  }
}

export function loadCertificateRecommendations(): CertificateRecommendation[] {
  return readAll();
}

export function pushCertificateRecommendation(input: {
  achievementId: string;
  achievementTitle: string;
  achievementType: string;
  studentId: string;
  studentName: string;
  studentClassLabel: string;
  recommendedBy?: string;
  note?: string;
}): CertificateRecommendation {
  const existing = readAll().find(
    (r) => r.achievementId === input.achievementId && r.status === "pending",
  );
  if (existing) return existing;

  const row: CertificateRecommendation = {
    id: `crec-${Date.now()}`,
    achievementId: input.achievementId,
    achievementTitle: input.achievementTitle,
    achievementType: input.achievementType,
    studentId: input.studentId,
    studentName: input.studentName,
    studentClassLabel: input.studentClassLabel,
    recommendedBy: input.recommendedBy ?? "Activity Teacher",
    recommendedAt: new Date().toISOString(),
    status: "pending",
    note: input.note,
  };
  writeAll([row, ...readAll()]);
  return row;
}

export function markCertificateRecommendationIssued(
  id: string,
): CertificateRecommendation | null {
  const next = readAll().map((r) =>
    r.id === id
      ? { ...r, status: "issued" as const, issuedAt: new Date().toISOString() }
      : r,
  );
  writeAll(next);
  return next.find((r) => r.id === id) ?? null;
}

export function dismissCertificateRecommendation(id: string): void {
  writeAll(
    readAll().map((r) => (r.id === id ? { ...r, status: "dismissed" as const } : r)),
  );
}

export function pendingCertificateRecommendations(): CertificateRecommendation[] {
  return readAll().filter((r) => r.status === "pending");
}
