import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel: string): string {
  return readFileSync(join(backendRoot, rel), "utf8");
}

describe("ops docs (Phase 1 Step 6)", () => {
  it("ships OPS.md and links it from README / DEPLOY / .env.example", () => {
    expect(existsSync(join(backendRoot, "OPS.md"))).toBe(true);
    expect(existsSync(join(backendRoot, "README.md"))).toBe(true);
    expect(existsSync(join(backendRoot, "DEPLOY.md"))).toBe(true);

    const readme = read("README.md");
    const deploy = read("DEPLOY.md");
    const envExample = read(".env.example");
    const ops = read("OPS.md");

    expect(readme).toMatch(/OPS\.md/);
    expect(readme).toMatch(/DEPLOY\.md/);
    expect(readme).toMatch(/Phase 1/);
    expect(deploy).toMatch(/OPS\.md/);
    expect(envExample).toMatch(/OPS\.md/);
  });

  it("documents OTP, write-gate, and lifecycle cron runbooks", () => {
    const ops = read("OPS.md");
    expect(ops).toMatch(/login_otp_challenge/);
    expect(ops).toMatch(/SUBSCRIPTION_READ_ONLY/);
    expect(ops).toMatch(/sync-lifecycle/);
    expect(ops).toMatch(/SUBSCRIPTION_LIFECYCLE_SYNC_MS/);
    expect(ops).toMatch(/OTP_DELIVERY_MODE/);
    expect(ops).toMatch(/request-otp/);
  });

  it("README lists all six Phase 1 steps as done", () => {
    const readme = read("README.md");
    for (const step of [
      "Real OTP delivery",
      "Durable OTP store",
      "Subscription write-gate",
      "Lifecycle automation",
      "Deploy packaging",
      "Ops docs",
    ]) {
      expect(readme).toContain(step);
    }
  });
});
