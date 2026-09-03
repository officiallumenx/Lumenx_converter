import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(backendRoot, "..");

describe("production packaging artifacts", () => {
  it("ships Docker / PM2 / systemd deploy files", () => {
    expect(existsSync(join(backendRoot, "Dockerfile"))).toBe(true);
    expect(existsSync(join(backendRoot, "DEPLOY.md"))).toBe(true);
    expect(existsSync(join(backendRoot, "deploy", "docker-compose.yml"))).toBe(
      true,
    );
    expect(existsSync(join(backendRoot, "deploy", "ecosystem.config.cjs"))).toBe(
      true,
    );
    expect(existsSync(join(backendRoot, "deploy", "lumenx-api.service"))).toBe(
      true,
    );
    expect(existsSync(join(backendRoot, "scripts", "build.mjs"))).toBe(true);
    expect(existsSync(join(backendRoot, "scripts", "prod-smoke.mjs"))).toBe(
      true,
    );
    expect(existsSync(join(backendRoot, "scripts", "bundle-migrations.mjs"))).toBe(
      true,
    );
  });

  it("package scripts expose build/start/smoke/migrations", () => {
    const pkg = JSON.parse(
      readFileSync(join(backendRoot, "package.json"), "utf8"),
    );
    expect(pkg.scripts.build).toBeTruthy();
    expect(pkg.scripts.start).toContain("dist/index.js");
    expect(pkg.scripts.smoke).toBeTruthy();
    expect(pkg.scripts["migrations:list"]).toBeTruthy();
    expect(pkg.scripts["migrations:bundle"]).toBeTruthy();
  });

  it("lists ordered Supabase migrations for prod apply", () => {
    const dir = join(repoRoot, "supabase", "migrations");
    const files = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    expect(files.length).toBeGreaterThan(40);
    expect(files.some((f) => f.includes("login_otp_challenge"))).toBe(true);
    expect(files[0] < files[files.length - 1]!).toBe(true);
  });
});
