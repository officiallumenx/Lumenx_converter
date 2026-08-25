import { isProductId, type ProductId } from "@/theme/products";
import { isDemoFlowId, type DemoFlowId } from "@/content/demos";
import { isSolutionId, type SolutionId } from "@/content/solutions";
import { isFeatureGroupId, type FeatureGroupId } from "@/content/features";
import { isModuleSectionId, type ModuleSectionId } from "@/content/modules";
import { isHowStepId, type HowStepId } from "@/content/how-it-works";
import {
  isGetStartedInterestId,
  isGetStartedStep,
  type GetStartedInterestId,
  type GetStartedStep,
} from "@/content/get-started";

export type ContactIntent = "trial" | "quote" | "partner" | "question";

export function parseContactIntent(value: unknown): ContactIntent {
  if (value === "quote" || value === "partner" || value === "trial" || value === "question") return value;
  return "trial";
}

export function parseStudentQuery(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

export type ContactSearch = {
  intent: ContactIntent;
  students?: number;
};

export type PricingSearch = {
  students?: number;
};

export function contactSearch(intent: ContactIntent, students?: number): ContactSearch {
  return students === undefined ? { intent } : { intent, students };
}

export function parseContactSearch(search: Record<string, unknown>): ContactSearch {
  return contactSearch(parseContactIntent(search.intent), parseStudentQuery(search.students));
}

export function parsePricingSearch(search: Record<string, unknown>): PricingSearch {
  const students = parseStudentQuery(search.students);
  return students === undefined ? {} : { students };
}

export type DemoSearch = {
  demo?: DemoFlowId;
  product?: ProductId;
};

export function parseDemoSearch(search: Record<string, unknown>): DemoSearch {
  const demo = typeof search.demo === "string" && isDemoFlowId(search.demo) ? search.demo : undefined;
  const product =
    typeof search.product === "string" && isProductId(search.product) ? search.product : undefined;
  if (!demo && !product) return {};
  return { ...(demo ? { demo } : {}), ...(product ? { product } : {}) };
}

export function resolveDemoFlow(search: DemoSearch): DemoFlowId {
  if (search.demo) return search.demo;
  if (search.product === "transport") return "transport";
  if (search.product === "admissions") return "admissions";
  if (search.product === "admin") return "fees";
  if (search.product === "nexus") return "notifications";
  return "attendance";
}

export type SolutionsSearch = {
  role?: SolutionId;
};

export function parseSolutionsSearch(search: Record<string, unknown>): SolutionsSearch {
  const role = typeof search.role === "string" && isSolutionId(search.role) ? search.role : undefined;
  return role ? { role } : {};
}

export type FeaturesSearch = {
  group?: FeatureGroupId;
};

export function parseFeaturesSearch(search: Record<string, unknown>): FeaturesSearch {
  const group = typeof search.group === "string" && isFeatureGroupId(search.group) ? search.group : undefined;
  return group ? { group } : {};
}

export type ModulesSearch = {
  section?: ModuleSectionId;
};

export function parseModulesSearch(search: Record<string, unknown>): ModulesSearch {
  const section =
    typeof search.section === "string" && isModuleSectionId(search.section) ? search.section : undefined;
  return section ? { section } : {};
}

export type HowItWorksSearch = {
  step?: HowStepId;
};

export function parseHowItWorksSearch(search: Record<string, unknown>): HowItWorksSearch {
  const step = typeof search.step === "string" && isHowStepId(search.step) ? search.step : undefined;
  return step ? { step } : {};
}

export type GetStartedSearch = {
  step?: GetStartedStep;
  interest?: GetStartedInterestId;
};

export function parseGetStartedSearch(search: Record<string, unknown>): GetStartedSearch {
  const step = typeof search.step === "string" && isGetStartedStep(search.step) ? search.step : undefined;
  const interest =
    typeof search.interest === "string" && isGetStartedInterestId(search.interest)
      ? search.interest
      : undefined;
  if (!step && !interest) return {};
  return { ...(step ? { step } : {}), ...(interest ? { interest } : {}) };
}

export type DownloadsSearch = {
  product?: ProductId;
};

export function parseDownloadsSearch(search: Record<string, unknown>): DownloadsSearch {
  const product =
    typeof search.product === "string" && isProductId(search.product) && search.product !== "nexus"
      ? search.product
      : undefined;
  return product ? { product } : {};
}
