import { isApiAuthMode } from "@/auth/auth-mode";
import { listIssuedCertificates } from "@/lib/certificates/api";
import type { IssuedCertificateDto } from "@/lib/certificates/types";
import { getActivityApiInstituteId } from "@/lib/activity/context";
import {
  getCertificateByIdFromStore,
  listCertificatesFromStore,
} from "./store";
import type {
  ActivityCertificate,
  CertificateCategory,
  CertificateListFilters,
  CertificateStatus,
} from "./types";

const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

let apiCache: ActivityCertificate[] = [];

function requireInstituteId(): string {
  const id = getActivityApiInstituteId();
  if (!id) throw new Error("Activity API context is not configured");
  return id;
}

function mapCategory(raw: string | null): CertificateCategory {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("sport")) return "sports";
  if (value.includes("academ")) return "academic";
  if (value.includes("cultur")) return "cultural";
  if (value.includes("particip")) return "participation";
  if (value.includes("excel")) return "excellence";
  if (value.includes("compet")) return "competition";
  return "participation";
}

function mapStatus(status: IssuedCertificateDto["status"]): CertificateStatus {
  if (status === "revoked") return "revoked";
  return "issued";
}

function mapIssuedCertificate(row: IssuedCertificateDto): ActivityCertificate {
  const category = mapCategory(row.category);
  const issueDate = row.issuedAt.slice(0, 10);
  return {
    id: row.id,
    certificateNumber: row.certificateNumber,
    verificationId: row.certificateNumber,
    templateId: row.templateId,
    templateName: row.templateName,
    category,
    achievementRef: {
      achievementId: row.id,
      achievementTitle: row.title,
      sourceModule: category === "sports" ? "sports" : "competitions",
    },
    studentId: row.studentId ?? "",
    studentName: row.recipientName,
    studentClassLabel: row.recipientRef ?? "—",
    issueDate,
    status: mapStatus(row.status),
    qrVerificationUrl: `/certificates/verify?n=${encodeURIComponent(row.certificateNumber)}`,
    reissueCount: 0,
    revokedAt: row.revokedAt?.slice(0, 10) ?? undefined,
    revokeReason: row.revokeReason ?? undefined,
    createdAt: row.createdAt.slice(0, 10),
    updatedAt: row.updatedAt.slice(0, 10),
  };
}

function applyFilters(
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

async function loadApiCertificates(): Promise<ActivityCertificate[]> {
  const instituteId = requireInstituteId();
  const rows = await listIssuedCertificates({ instituteId });
  apiCache = rows.map(mapIssuedCertificate);
  return apiCache;
}

/** Read-only projection of certificates issued by Admin for Activity reporting. */
export const certificatesRepository = {
  async listCertificates(filters?: CertificateListFilters): Promise<ActivityCertificate[]> {
    if (isApiAuthMode()) {
      const rows = await loadApiCertificates();
      return applyFilters(rows, filters);
    }
    await delay();
    return listCertificatesFromStore(filters);
  },
  getCertificatesSnapshot(): ActivityCertificate[] {
    if (isApiAuthMode()) return apiCache.map((c) => ({ ...c }));
    return listCertificatesFromStore();
  },
  async getCertificateById(id: string): Promise<ActivityCertificate | null> {
    if (isApiAuthMode()) {
      const rows = await loadApiCertificates();
      return rows.find((c) => c.id === id) ?? null;
    }
    await delay(120);
    return getCertificateByIdFromStore(id);
  },
};
