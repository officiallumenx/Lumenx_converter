/** Institute document registry (demo). */

export type DocOwner = "student" | "teacher";
export type DocCategory =
  | "Identity"
  | "Transfer Certificate"
  | "Bonafide"
  | "Certificate"
  | "Contract"
  | "Qualification";

export type VerificationStatus = "verified" | "pending" | "expired" | "rejected";

export type InstituteDocument = {
  id: string;
  title: string;
  ownerType: DocOwner;
  ownerName: string;
  ownerRef: string;
  category: DocCategory;
  fileName: string;
  uploadedAt: string;
  expiryDate: string | null;
  verification: VerificationStatus;
  sizeMb: number;
};

const SEED: InstituteDocument[] = [
  {
    id: "DOC-501",
    title: "Aadhaar Card",
    ownerType: "student",
    ownerName: "Aanya Sharma",
    ownerRef: "STU-1042",
    category: "Identity",
    fileName: "aanya_aadhaar.pdf",
    uploadedAt: "2026-01-12",
    expiryDate: null,
    verification: "verified",
    sizeMb: 0.8,
  },
  {
    id: "DOC-502",
    title: "Transfer Certificate",
    ownerType: "student",
    ownerName: "Julian Draxler",
    ownerRef: "STU-882",
    category: "Transfer Certificate",
    fileName: "julian_tc.pdf",
    uploadedAt: "2025-06-02",
    expiryDate: null,
    verification: "verified",
    sizeMb: 1.2,
  },
  {
    id: "DOC-503",
    title: "Bonafide Certificate",
    ownerType: "student",
    ownerName: "Alina Moreno",
    ownerRef: "STU-331",
    category: "Bonafide",
    fileName: "alina_bonafide_2026.pdf",
    uploadedAt: "2026-03-18",
    expiryDate: "2026-12-31",
    verification: "pending",
    sizeMb: 0.4,
  },
  {
    id: "DOC-504",
    title: "Passport",
    ownerType: "student",
    ownerName: "Marcus Lee",
    ownerRef: "STU-1190",
    category: "Identity",
    fileName: "marcus_passport.pdf",
    uploadedAt: "2024-11-05",
    expiryDate: "2026-05-01",
    verification: "expired",
    sizeMb: 2.1,
  },
  {
    id: "DOC-505",
    title: "Character Certificate",
    ownerType: "student",
    ownerName: "Priya Patel",
    ownerRef: "STU-220",
    category: "Certificate",
    fileName: "priya_character.pdf",
    uploadedAt: "2026-02-20",
    expiryDate: null,
    verification: "verified",
    sizeMb: 0.6,
  },
  {
    id: "DOC-601",
    title: "Employment Contract",
    ownerType: "teacher",
    ownerName: "Sarah Jenkins",
    ownerRef: "TCH-014",
    category: "Contract",
    fileName: "jenkins_contract_2025.pdf",
    uploadedAt: "2025-04-01",
    expiryDate: "2027-03-31",
    verification: "verified",
    sizeMb: 1.5,
  },
  {
    id: "DOC-602",
    title: "PhD Certificate",
    ownerType: "teacher",
    ownerName: "David Koal",
    ownerRef: "TCH-022",
    category: "Qualification",
    fileName: "koal_phd.pdf",
    uploadedAt: "2023-08-14",
    expiryDate: null,
    verification: "verified",
    sizeMb: 3.2,
  },
  {
    id: "DOC-603",
    title: "ID Proof",
    ownerType: "teacher",
    ownerName: "Priya Iyer",
    ownerRef: "TCH-008",
    category: "Identity",
    fileName: "iyer_id.pdf",
    uploadedAt: "2026-05-10",
    expiryDate: "2031-05-09",
    verification: "pending",
    sizeMb: 0.9,
  },
  {
    id: "DOC-604",
    title: "Experience Letter",
    ownerType: "teacher",
    ownerName: "Marcus Whitfield",
    ownerRef: "TCH-031",
    category: "Certificate",
    fileName: "whitfield_exp.pdf",
    uploadedAt: "2025-01-08",
    expiryDate: null,
    verification: "rejected",
    sizeMb: 0.7,
  },
];

export const DOC_CATEGORIES: DocCategory[] = [
  "Identity",
  "Transfer Certificate",
  "Bonafide",
  "Certificate",
  "Contract",
  "Qualification",
];

export function getDocuments(): InstituteDocument[] {
  return SEED.map((d) => ({ ...d }));
}

export function documentSummary(docs: InstituteDocument[]) {
  return {
    total: docs.length,
    student: docs.filter((d) => d.ownerType === "student").length,
    teacher: docs.filter((d) => d.ownerType === "teacher").length,
    pending: docs.filter((d) => d.verification === "pending").length,
    expired: docs.filter((d) => d.verification === "expired").length,
    verified: docs.filter((d) => d.verification === "verified").length,
  };
}
