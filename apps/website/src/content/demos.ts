import type { ProductId } from "@/theme/products";

export const DEMO_FLOW_IDS = [
  "attendance",
  "transport",
  "fees",
  "notifications",
  "admissions",
] as const;

export type DemoFlowId = (typeof DEMO_FLOW_IDS)[number];

export type DemoPriority = "normal" | "important" | "critical" | "success";

export const DEMO_FLOWS: {
  id: DemoFlowId;
  title: string;
  lede: string;
  product: ProductId;
}[] = [
  {
    id: "attendance",
    title: "Attendance",
    lede: "A teacher marks the class. The parent sees the same record in Connect.",
    product: "connect",
  },
  {
    id: "transport",
    title: "Transport",
    lede: "Morning pickup: 30 / 15 / 5 minute approach, arrival, boarding, then school.",
    product: "transport",
  },
  {
    id: "fees",
    title: "Fees",
    lede: "A fee is added, comes due, is reminded, then overdue. No payment on this site.",
    product: "admin",
  },
  {
    id: "notifications",
    title: "Notifications",
    lede: "An event becomes a notice with a category, a priority, and a deep link.",
    product: "connect",
  },
  {
    id: "admissions",
    title: "Admissions",
    lede: "Discover, apply, documents, review, interview on the file, then a decision.",
    product: "admissions",
  },
];

export function isDemoFlowId(value: string): value is DemoFlowId {
  return (DEMO_FLOW_IDS as readonly string[]).includes(value);
}

/** School-facing products visitors can explore on /demo. Nexus is the service platform. */
export const DEMO_EXPLORE_IDS = ["admin", "connect", "transport", "admissions", "careers"] as const;
export type DemoExploreId = (typeof DEMO_EXPLORE_IDS)[number];

export function isDemoExploreId(value: string): value is DemoExploreId {
  return (DEMO_EXPLORE_IDS as readonly string[]).includes(value);
}

export const DEMO_EXPLORE: {
  id: DemoExploreId;
  lede: string;
  flow?: DemoFlowId;
}[] = [
  {
    id: "admin",
    lede: "The office console — people, attendance, and fees on the institute record.",
    flow: "fees",
  },
  {
    id: "connect",
    lede: "Parents, teachers, and students. Strict role isolation. Mock data only.",
    flow: "attendance",
  },
  {
    id: "transport",
    lede: "A driver app for the day’s trip. Parents see status in Connect — not a live GPS map.",
    flow: "transport",
  },
  {
    id: "admissions",
    lede: "Discover, apply, and decide on one file. Admin converts accepted intake.",
    flow: "admissions",
  },
  {
    id: "careers",
    lede: "Jobs and applications in a Connect portal. Admin converts an approved hire.",
  },
];

export function demoFlowForProduct(id: ProductId): DemoFlowId | undefined {
  return DEMO_EXPLORE.find((item) => item.id === id)?.flow;
}

export const DEMO_STUDENT = {
  name: "Aanya",
  classLabel: "Grade 8 · Section A",
  stop: "Agara gate",
  bus: "KA-01-R12",
  route: "R12",
  routeName: "HSR Layout loop",
} as const;
