import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const RULE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("alert-rules-api", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses list in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listAlertRules } = await import("./api");
    await expect(listAlertRules(INST)).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const get = vi.fn();
    const client = { get } as never;
    const { listAlertRules } = await import("./api");
    await expect(listAlertRules("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(get).not.toHaveBeenCalled();
  });

  it("posts create and patches update in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: RULE });
    const patch = vi.fn().mockResolvedValue({ id: RULE, active: false });
    const client = { post, patch } as never;
    const { createAlertRule, updateAlertRule } = await import("./api");
    await createAlertRule(
      { instituteId: INST, name: "SLA", iconKey: "complaint" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/alert-rules",
      expect.objectContaining({
        institute_id: INST,
        name: "SLA",
        icon_key: "complaint",
      }),
    );
    await updateAlertRule(RULE, { active: false }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/alert-rules/${RULE}`,
      expect.objectContaining({ active: false }),
    );
  });

  it("deletes by UUID and rejects invalid id without network", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn().mockResolvedValue(undefined);
    const client = { delete: del } as never;
    const { deleteAlertRule } = await import("./api");
    await expect(deleteAlertRule("bad", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
    await deleteAlertRule(RULE, client);
    expect(del).toHaveBeenCalledWith(`/api/v1/alert-rules/${RULE}`);
  });

  it("posts evaluate with institute_id query", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ fired: [] });
    const client = { post } as never;
    const { evaluateAlertRules } = await import("./api");
    await evaluateAlertRules(INST, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/alert-rules/evaluate?institute_id=${INST}`,
      {},
    );
  });
});
