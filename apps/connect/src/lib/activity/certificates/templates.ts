import type { CertificateTemplate } from "./types";

export const certificateTemplates: CertificateTemplate[] = [
  {
    id: "tpl-sports-classic",
    name: "Sports Excellence — Classic",
    description: "Traditional bordered layout for sports achievements and MVPs.",
    category: "sports",
    layout: "classic",
  },
  {
    id: "tpl-sports-modern",
    name: "Sports Achievement — Modern",
    description: "Clean modern layout with accent header for match outcomes.",
    category: "sports",
    layout: "modern",
  },
  {
    id: "tpl-participation",
    name: "Participation Certificate",
    description: "General participation recognition across activity modules.",
    category: "participation",
    layout: "classic",
  },
  {
    id: "tpl-excellence-formal",
    name: "Excellence Award — Formal",
    description: "Formal seal layout for inter-school and district level awards.",
    category: "excellence",
    layout: "formal",
  },
  {
    id: "tpl-competition",
    name: "Competition Winner",
    description: "Competition and tournament winner certificates.",
    category: "competition",
    layout: "modern",
  },
];

export function getCertificateTemplate(id: string): CertificateTemplate | undefined {
  return certificateTemplates.find((t) => t.id === id);
}
