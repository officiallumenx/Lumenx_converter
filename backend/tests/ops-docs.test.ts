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

  it("documents Phase 2 Steps 7–10 as complete and storage hard-deny", () => {
    const readme = read("README.md");
    const ops = read("OPS.md");
    expect(readme).toMatch(/Product-ready backend \(Steps 1–10\): 100%/);
    expect(ops).toMatch(/Product-ready backend status — \*\*100%\*\*/);
    expect(ops).toMatch(/hard-deny/);
    expect(ops).toMatch(/convert-to-teacher/);
    expect(ops).toMatch(/BACKGROUND_JOBS_INTERVAL_MS/);
    expect(ops).toMatch(/Idempotency-Key/);
    expect(ops).toMatch(/Sports V2 satellites/);
  });

  it("documents long-term blueprint (V1+V1.5+V2) as 100%", () => {
    const readme = read("README.md");
    const ops = read("OPS.md");

    expect(readme).toMatch(/Long-term blueprint \(V1\+V1\.5\+V2\) — \*\*100%\*\*/);
    expect(ops).toMatch(/Long-term blueprint \(V1\+V1\.5\+V2\) — 100%/);

    expect(ops).toMatch(/mark_publication/);
    expect(ops).toMatch(/diary_submission/);
    expect(ops).toMatch(/role_permission/);
    expect(ops).toMatch(/transport_trip/);
    expect(ops).toMatch(/transport_boarding_event/);
    expect(ops).toMatch(/transport_emergency/);

    expect(ops).toMatch(/mv_attendance_monthly/);
    expect(ops).toMatch(/mv_fee_collection_monthly/);
    expect(ops).toMatch(/mv_platform_network_metrics/);
    expect(ops).toMatch(/mv_institute_kpi_snapshot/);
    expect(ops).toMatch(/refresh_blueprint_rollups/);

    expect(ops).toMatch(/school-fee online payment gateway/i);
    expect(ops).toMatch(/traffic-grade maps engine/i);
    expect(ops).toMatch(/Hono domain services/);
  });

  it("documents Headline overall backend as 100%", () => {
    const readme = read("README.md");
    const ops = read("OPS.md");
    expect(ops).toMatch(/Headline overall backend — \*\*100%\*\*/);
    expect(readme).toMatch(/Headline overall backend — \*\*100%\*\*/);
    expect(ops).toMatch(/\|\s*\*\*Headline overall\*\*\s*\|\s*.*\*\*100%\*\*/);
    expect(readme).toMatch(/\|\s*\*\*Headline overall\*\*\s*\|\s*\*\*100%\*\*/);
  });

  it("blueprint migration files exist", () => {
    const migrationsDir = join(backendRoot, "..", "supabase", "migrations");
    const migrations = [
      "20260905150000_mark_publication.sql",
      "20260905151000_blueprint_compat_views.sql",
      "20260905152000_blueprint_derived_views.sql",
      "20260905153000_blueprint_materialized_rollups.sql",
    ];
    for (const m of migrations) {
      expect(existsSync(join(migrationsDir, m))).toBe(true);
    }

    const compatViews = readFileSync(
      join(migrationsDir, "20260905151000_blueprint_compat_views.sql"),
      "utf8",
    );
    expect(compatViews).toMatch(/CREATE OR REPLACE VIEW/);
    expect(compatViews).toMatch(/diary_submission/);
    expect(compatViews).toMatch(/role_permission/);
    expect(compatViews).toMatch(/trip/);
    expect(compatViews).toMatch(/boarding_event/);
    expect(compatViews).toMatch(/emergency/);

    const rollups = readFileSync(
      join(migrationsDir, "20260905153000_blueprint_materialized_rollups.sql"),
      "utf8",
    );
    expect(rollups).toMatch(/CREATE MATERIALIZED VIEW/);
    expect(rollups).toMatch(/refresh_blueprint_rollups/);
  });
});
