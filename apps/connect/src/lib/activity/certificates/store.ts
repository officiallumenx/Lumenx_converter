import {
  getAchievementByIdFromStore,
  listAchievementsFromStore,
} from "../achievements/store";
import { sportTeamsSeed } from "../sports/mock-data";
import {
  certificatesSeed,
  cloneCertificate,
  createCertificateFromInput,
} from "./mock";
import { certificateTemplates } from "./templates";
import type {
  ActivityCertificate,
  ActivityCertificateInput,
  CertificateListFilters,
} from "./types";

let certificatesStore: ActivityCertificate[] = certificatesSeed.map(cloneCertificate);
let certificateSeq = certificatesStore.length + 1;

function hasActiveCertificateForAchievement(achievementId: string, excludeId?: string): boolean {
  return certificatesStore.some(
    (c) =>
      c.achievementRef.achievementId === achievementId &&
      c.status !== "revoked" &&
      c.id !== excludeId,
  );
}

function resolveAchievement(achievementId: string) {
  const achievement = getAchievementByIdFromStore(achievementId);
  if (!achievement) {
    throw new Error("Achievement not found — certificates require a valid achievement.");
  }
  if (!achievement.awardedAt) {
    throw new Error("Achievement must be awarded before generating a certificate.");
  }
  return achievement;
}

function applyCertificateFilters(
  items: ActivityCertificate[],
  filters?: CertificateListFilters,
): ActivityCertificate[] {
  let result = [...items];
  const f = filters ?? {};

  if (f.templateId && f.templateId !== "all") {
    result = result.filter((c) => c.templateId === f.templateId);
  }
  if (f.category && f.category !== "all") {
    result = result.filter((c) => c.category === f.category);
  }
  if (f.studentId && f.studentId !== "all") {
    result = result.filter((c) => c.studentId === f.studentId);
  }
  if (f.teamId && f.teamId !== "all") {
    result = result.filter((c) => c.teamId === f.teamId);
  }
  if (f.status && f.status !== "all") {
    result = result.filter((c) => c.status === f.status);
  }
  if (f.date && f.date !== "all") {
    result = result.filter((c) => c.issueDate === f.date);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (c) =>
        c.certificateNumber.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.achievementRef.achievementTitle.toLowerCase().includes(q) ||
        c.templateName.toLowerCase().includes(q) ||
        c.verificationId.toLowerCase().includes(q) ||
        (c.teamName?.toLowerCase().includes(q) ?? false),
    );
  }

  const sortBy = f.sortBy ?? "date";
  const sortDir = f.sortDir ?? "desc";
  const dir = sortDir === "asc" ? 1 : -1;

  result.sort((a, b) => {
    if (sortBy === "student") return dir * a.studentName.localeCompare(b.studentName);
    if (sortBy === "updatedAt") return dir * a.updatedAt.localeCompare(b.updatedAt);
    return dir * a.issueDate.localeCompare(b.issueDate);
  });

  return result;
}

export function resetCertificatesStore() {
  certificatesStore = certificatesSeed.map(cloneCertificate);
  certificateSeq = certificatesStore.length + 1;
}

export function listCertificatesFromStore(filters?: CertificateListFilters): ActivityCertificate[] {
  return applyCertificateFilters(certificatesStore, filters).map(cloneCertificate);
}

export function getCertificateByIdFromStore(id: string): ActivityCertificate | null {
  const found = certificatesStore.find((c) => c.id === id);
  return found ? cloneCertificate(found) : null;
}

export function createCertificateInStore(input: ActivityCertificateInput): ActivityCertificate {
  const achievement = resolveAchievement(input.achievementId);
  if (hasActiveCertificateForAchievement(input.achievementId)) {
    throw new Error("An active certificate already exists for this achievement.");
  }
  const record = createCertificateFromInput(input, achievement, certificateSeq++);
  certificatesStore = [record, ...certificatesStore];
  return cloneCertificate(record);
}

export function issueCertificateInStore(id: string): ActivityCertificate {
  const idx = certificatesStore.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Certificate not found");
  if (certificatesStore[idx].status === "revoked") {
    throw new Error("Revoked certificates cannot be issued.");
  }
  const issued = cloneCertificate({
    ...certificatesStore[idx],
    status: "issued",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  certificatesStore = certificatesStore.map((c) => (c.id === id ? issued : c));
  return cloneCertificate(issued);
}

export function revokeCertificateInStore(id: string, reason?: string): ActivityCertificate {
  const idx = certificatesStore.findIndex((c) => c.id === id);
  if (idx < 0) throw new Error("Certificate not found");
  const revoked = cloneCertificate({
    ...certificatesStore[idx],
    status: "revoked",
    revokedAt: new Date().toISOString().slice(0, 10),
    revokeReason: reason?.trim() || "Revoked by administrator",
    updatedAt: new Date().toISOString().slice(0, 10),
  });
  certificatesStore = certificatesStore.map((c) => (c.id === id ? revoked : c));
  return cloneCertificate(revoked);
}

export function reissueCertificateInStore(id: string): ActivityCertificate {
  const prev = certificatesStore.find((c) => c.id === id);
  if (!prev) throw new Error("Certificate not found");
  if (prev.status !== "issued") {
    throw new Error("Only issued certificates can be reissued.");
  }

  const achievement = resolveAchievement(prev.achievementRef.achievementId);
  const reissued = createCertificateFromInput(
    {
      achievementId: prev.achievementRef.achievementId,
      templateId: prev.templateId,
      issueDate: new Date().toISOString().slice(0, 10),
    },
    achievement,
    certificateSeq++,
  );

  const withMeta = cloneCertificate({
    ...reissued,
    reissuedFromId: prev.id,
    reissueCount: prev.reissueCount + 1,
    status: "issued",
  });

  certificatesStore = [withMeta, ...certificatesStore];
  return cloneCertificate(withMeta);
}

export function listEligibleAchievementOptions(): {
  achievementId: string;
  label: string;
  studentName: string;
  date: string;
  hasCertificate: boolean;
}[] {
  const noted = new Set(
    certificatesStore
      .filter((c) => c.status !== "revoked")
      .map((c) => c.achievementRef.achievementId),
  );

  return listAchievementsFromStore()
    .filter((a) => a.awardedAt)
    .map((a) => ({
      achievementId: a.id,
      label: `${a.title} — ${a.studentName} (${a.studentClassLabel})`,
      studentName: a.studentName,
      date: a.date,
      hasCertificate: noted.has(a.id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function listCertificateTemplates() {
  return certificateTemplates.map((t) => ({ ...t }));
}

export function listStudentFilterOptions(): { id: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const c of certificatesStore) {
    seen.set(c.studentId, `${c.studentName} (${c.studentClassLabel})`);
  }
  return [...seen.entries()].map(([id, label]) => ({ id, label }));
}

export function listTeamFilterOptions(): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const c of certificatesStore) {
    if (c.teamId && c.teamName) seen.set(c.teamId, c.teamName);
  }
  for (const t of sportTeamsSeed) {
    if (!seen.has(t.id)) seen.set(t.id, t.name);
  }
  return [...seen.entries()].map(([id, name]) => ({ id, name }));
}
