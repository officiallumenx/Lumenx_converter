import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { PolicyRuleDto } from "./types";

const RULE_ID = "11111111-1111-4111-8111-111111111111";

function sampleRule(): PolicyRuleDto {
  return {
    id: RULE_ID,
    kind: "payment_overdue",
    name: "Payment overdue",
    description: "Fires when payment is overdue.",
    conditionText: "institute.paymentStatus = overdue",
    severityDefault: "high",
    enabled: true,
    updatedByUserId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("nexus policies api", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects VITE_NEXUS_AUTH_MODE=demo at auth boot (API-only product)", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "demo");
    const { getNexusAuthMode, isNexusApiMode } = await import("@/lib/auth-mode");
    expect(() => getNexusAuthMode()).toThrow(/Demo Mode is no longer supported/);
    expect(isNexusApiMode()).toBe(true);
  });

  it("lists policy rules in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { listPolicyRules } = await import("./api");
    const dto = sampleRule();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listPolicyRules(client)).resolves.toEqual([dto]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/nexus/policies/rules",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("patches rule enabled flag in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { updatePolicyRule } = await import("./api");
    const dto = { ...sampleRule(), enabled: false };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: dto }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(updatePolicyRule(RULE_ID, { enabled: false }, client)).resolves.toEqual(dto);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/api/nexus/policies/rules/${RULE_ID}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("loads derived alerts in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { listDerivedPlatformAlerts } = await import("./api");
    const alert = {
      id: "renewal_approaching:inst-1",
      kind: "renewal_approaching",
      title: "Renewal approaching",
      summary: "Trial ends soon",
      severity: "medium",
      instituteId: "inst-1",
      instituteName: "Alpha",
      ruleId: RULE_ID,
      detectedAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [alert] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listDerivedPlatformAlerts(client)).resolves.toEqual([alert]);
  });
});
