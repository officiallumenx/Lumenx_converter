/**
 * Nexus network analytics — API auth mode.
 */
import { getNexusApiClient } from "@/lib/nexus-api";
import { isNexusApiMode } from "@/lib/auth-mode";
import type { NexusApiClient } from "@/lib/api";

export type NetworkAnalyticsRange = "30d" | "90d" | "6m" | "12m";

export type NetworkAnalyticsDto = {
  range: NetworkAnalyticsRange;
  generatedAt: string;
  instituteOptions: Array<{ id: string; name: string }>;
  kpis: {
    institutes: number;
    activeInstitutes: number;
    inactiveInstitutes: number;
    students: number;
    faculty: number;
    parents: number;
    platformUsers: number;
    billedInr: number;
    paidInr: number;
    pendingInr: number;
    renewalsInWindow: number;
    supportOpen: number;
    supportResolved: number;
  };
  series: {
    labels: string[];
    instituteGrowth: number[];
    studentGrowth: number[];
    facultyGrowth: number[];
    parentGrowth: number[];
    userGrowth: number[];
    billedInr: number[];
    paidInr: number[];
    renewals: number[];
    supportOpen: number[];
    supportResolved: number[];
  };
  planMix: { core: number; plus: number; max: number };
  moduleAdoption: Array<{
    id: string;
    label: string;
    enabled: number;
    total: number;
    pct: number;
  }>;
};

function assertApiMode(): void {
  if (!isNexusApiMode()) {
    throw new Error("Nexus network analytics API is only available in API auth mode");
  }
}

export async function getNetworkAnalytics(
  input?: {
    range?: NetworkAnalyticsRange;
    instituteId?: string;
    plan?: "all" | "core" | "plus" | "max";
  },
  client: NexusApiClient = getNexusApiClient(),
): Promise<NetworkAnalyticsDto> {
  assertApiMode();
  const query = new URLSearchParams();
  if (input?.range) query.set("range", input.range);
  if (input?.instituteId) query.set("institute_id", input.instituteId);
  if (input?.plan && input.plan !== "all") query.set("plan", input.plan);
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return client.get<NetworkAnalyticsDto>(`/api/nexus/analytics/network${suffix}`);
}
