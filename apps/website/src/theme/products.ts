export const PRODUCT_IDS = [
  "admin",
  "connect",
  "transport",
  "admissions",
  "careers",
  "nexus",
] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

export type ProductIdentity = {
  id: ProductId;
  name: string;
  shortName: string;
  role: string;
};

/** Visual family — all six have dedicated product pages. */
export const PRODUCT_FAMILY: Record<ProductId, ProductIdentity> = {
  admin: {
    id: "admin",
    name: "LumenX Admin",
    shortName: "Admin",
    role: "Institute operations",
  },
  connect: {
    id: "connect",
    name: "LumenX Connect",
    shortName: "Connect",
    role: "Parents, teachers, students",
  },
  transport: {
    id: "transport",
    name: "LumenX Transport",
    shortName: "Transport",
    role: "Fleet and trips",
  },
  admissions: {
    id: "admissions",
    name: "LumenX Admissions",
    shortName: "Admissions",
    role: "Applications and intake",
  },
  careers: {
    id: "careers",
    name: "LumenX Careers",
    shortName: "Careers",
    role: "Hiring and talent",
  },
  nexus: {
    id: "nexus",
    name: "LumenX Nexus",
    shortName: "Nexus",
    role: "Service platform",
  },
};

export const PRODUCT_FAMILY_LIST = PRODUCT_IDS.map((id) => PRODUCT_FAMILY[id]);

export function isProductId(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value);
}
