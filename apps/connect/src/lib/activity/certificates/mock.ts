import type { ActivityAchievement } from "../achievements/types";
import { getCertificateTemplate } from "./templates";
import type { ActivityCertificate, ActivityCertificateInput } from "./types";

export function cloneCertificate(c: ActivityCertificate): ActivityCertificate {
  return {
    ...c,
    achievementRef: { ...c.achievementRef },
  };
}

function mockVerificationId(seed: string): string {
  return `VER-${seed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase().padEnd(8, "0")}`;
}

function mockQrUrl(verificationId: string): string {
  return `https://verify.lumenx.demo/cert/${verificationId}`;
}

export function buildCertificateNumber(seq: number, year = new Date().getFullYear()): string {
  return `CERT-${year}-${String(seq).padStart(4, "0")}`;
}

export function createCertificateFromInput(
  input: ActivityCertificateInput,
  achievement: ActivityAchievement,
  seq: number,
  id?: string,
): ActivityCertificate {
  const template = getCertificateTemplate(input.templateId);
  if (!template) throw new Error("Certificate template not found");

  const certId = id ?? `cert-${Date.now()}`;
  const verificationId = mockVerificationId(certId);
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: certId,
    certificateNumber: buildCertificateNumber(seq),
    verificationId,
    templateId: template.id,
    templateName: template.name,
    category: template.category,
    achievementRef: {
      achievementId: achievement.id,
      achievementTitle: achievement.title,
      sourceModule: achievement.source.module,
    },
    studentId: achievement.studentId,
    studentName: achievement.studentName,
    studentClassLabel: achievement.studentClassLabel,
    teamId: achievement.teamId,
    teamName: achievement.teamName,
    issueDate: input.issueDate,
    status: "draft",
    qrVerificationUrl: mockQrUrl(verificationId),
    reissueCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

export const certificatesSeed: ActivityCertificate[] = [
  {
    id: "cert-1",
    certificateNumber: "CERT-2026-0001",
    verificationId: "VER-CERT0001",
    templateId: "tpl-sports-classic",
    templateName: "Sports Excellence — Classic",
    category: "sports",
    achievementRef: {
      achievementId: "ach-1",
      achievementTitle: "Inter-House Football MVP",
      sourceModule: "sports",
    },
    studentId: "stu-1",
    studentName: "Arjun Mehta",
    studentClassLabel: "9-A",
    teamId: "team-football",
    teamName: "Senior Football Team",
    issueDate: new Date().toISOString().slice(0, 10),
    status: "issued",
    qrVerificationUrl: "https://verify.lumenx.demo/cert/VER-CERT0001",
    reissueCount: 0,
    createdAt: "2026-03-08",
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  {
    id: "cert-2",
    certificateNumber: "CERT-2026-0002",
    verificationId: "VER-CERT0002",
    templateId: "tpl-sports-modern",
    templateName: "Sports Achievement — Modern",
    category: "sports",
    achievementRef: {
      achievementId: "ach-2",
      achievementTitle: "League Match Winner",
      sourceModule: "sports",
    },
    studentId: "stu-2",
    studentName: "Priya Nair",
    studentClassLabel: "9-A",
    teamId: "team-football",
    teamName: "Senior Football Team",
    issueDate: "2026-03-08",
    status: "issued",
    qrVerificationUrl: "https://verify.lumenx.demo/cert/VER-CERT0002",
    reissueCount: 0,
    createdAt: "2026-03-08",
    updatedAt: "2026-03-08",
  },
];
