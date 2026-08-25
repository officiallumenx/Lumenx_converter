import type { ProductId } from "@/theme/products";

export const GET_STARTED_STEPS = ["explore", "choose", "next"] as const;
export type GetStartedStep = (typeof GET_STARTED_STEPS)[number];

export const GET_STARTED_INTEREST_IDS = [
  "office",
  "families",
  "trips",
  "intake",
  "hiring",
  "group",
] as const;

export type GetStartedInterestId = (typeof GET_STARTED_INTEREST_IDS)[number];

export type GetStartedInterest = {
  id: GetStartedInterestId;
  title: string;
  lede: string;
  product: ProductId;
  demo: boolean;
};

export const GET_STARTED_INTERESTS: GetStartedInterest[] = [
  {
    id: "office",
    title: "Run the office",
    lede: "People, classes, attendance, fees, and documents in Admin.",
    product: "admin",
    demo: true,
  },
  {
    id: "families",
    title: "Families and teachers",
    lede: "Connect is how parents, teachers, and students use the same record.",
    product: "connect",
    demo: true,
  },
  {
    id: "trips",
    title: "Transport and trips",
    lede: "Drivers run boarding and trip status. Parents follow in Connect.",
    product: "transport",
    demo: true,
  },
  {
    id: "intake",
    title: "Admissions",
    lede: "Applications that become a student record — a Connect portal.",
    product: "admissions",
    demo: true,
  },
  {
    id: "hiring",
    title: "Hiring",
    lede: "Jobs and applications that can become a teacher in Admin.",
    product: "careers",
    demo: true,
  },
  {
    id: "group",
    title: "A group of institutes",
    lede: "Nexus is the service platform — licensing, support, feedback, and health. Not the school office console.",
    product: "nexus",
    demo: false,
  },
];

export function isGetStartedStep(value: string): value is GetStartedStep {
  return (GET_STARTED_STEPS as readonly string[]).includes(value);
}

export function isGetStartedInterestId(value: string): value is GetStartedInterestId {
  return (GET_STARTED_INTEREST_IDS as readonly string[]).includes(value);
}
