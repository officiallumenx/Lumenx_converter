import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@/lib/nexus-api", () => ({
  getNexusApiClient: () => api,
}));

import {
  getCurrentOperatorApi,
  listOperatorsApi,
  provisionOperatorApi,
  updateOperatorApi,
} from "./operators-api";

const dto = {
  id: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
  roleCode: "support" as const,
  handle: "support.sam",
  displayName: "Sam",
  status: "invited" as const,
  createdAt: "2026-09-08T00:00:00.000Z",
  updatedAt: "2026-09-08T01:00:00.000Z",
};

describe("Nexus operators API", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists and maps durable operators", async () => {
    api.get.mockResolvedValue([dto]);
    await expect(listOperatorsApi()).resolves.toEqual([
      expect.objectContaining({
        id: dto.id,
        userId: dto.userId,
        roleId: "support",
        lastActiveAt: dto.updatedAt,
      }),
    ]);
    expect(api.get).toHaveBeenCalledWith("/api/nexus/operators");
  });

  it("loads current policy and sends create/update mutations", async () => {
    api.get.mockResolvedValue({ roleCode: "nexus_root", isRoot: true });
    await getCurrentOperatorApi();
    expect(api.get).toHaveBeenCalledWith("/api/nexus/operators/me");

    api.post.mockResolvedValue({
      operator: dto,
      credentials: {
        email: "sam@example.com",
        temporaryPassword: "TempPass@123",
        firstLoginPending: true,
      },
    });
    await provisionOperatorApi({
      email: "sam@example.com",
      phone: "9876543210",
      temporaryPassword: "TempPass@123",
      roleCode: "support",
      handle: "support.sam",
      displayName: "Sam",
    });
    expect(api.post).toHaveBeenCalledWith(
      "/api/nexus/operators/provision",
      expect.objectContaining({
        roleCode: "support",
        phone: "+919876543210",
        email: "sam@example.com",
      }),
    );

    api.request.mockResolvedValue({ ...dto, status: "disabled" });
    await updateOperatorApi(dto.id, { status: "disabled" });
    expect(api.request).toHaveBeenCalledWith(
      `/api/nexus/operators/${dto.id}`,
      { method: "PATCH", body: { status: "disabled" } },
    );
  });
});
