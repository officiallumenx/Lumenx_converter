#!/usr/bin/env node
/**
 * Production smoke checks against a running API.
 *
 * Required:
 *   SMOKE_API_BASE_URL (default http://127.0.0.1:8787)
 *
 * Optional (deeper checks):
 *   SMOKE_ACCESS_TOKEN   — Supabase JWT for authenticated calls
 *   SMOKE_INSTITUTE_ID   — institute UUID for academic / billing probes
 *   SMOKE_SKIP_AUTH=1    — health-only
 *   SMOKE_SKIP_FCM=1     — skip FCM readiness hint
 *
 * Exit 0 only when all selected steps pass.
 */
import { config as loadDotenv } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const API_BASE =
  process.env.SMOKE_API_BASE_URL?.trim() ||
  process.env.E2E_API_BASE_URL?.trim() ||
  "http://127.0.0.1:8787";

const token = process.env.SMOKE_ACCESS_TOKEN?.trim();
const instituteId = process.env.SMOKE_INSTITUTE_ID?.trim();
const skipAuth = process.env.SMOKE_SKIP_AUTH === "1";
const skipFcm = process.env.SMOKE_SKIP_FCM === "1";

const results = [];

function record(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}${detail ? ` — ${detail}` : ""}`);
}

async function api(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers ?? {}),
  };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body };
}

async function main() {
  console.log(`Smoke target: ${API_BASE}\n`);

  // 1 — Liveness
  try {
    const { res, body } = await api("/api/v1/health");
    record(
      "health.live",
      res.ok && body?.status === "ok",
      `HTTP ${res.status} env=${body?.env ?? "?"}`,
    );
  } catch (err) {
    record("health.live", false, err instanceof Error ? err.message : String(err));
  }

  // 2 — Readiness (Supabase)
  try {
    const { res, body } = await api("/api/v1/health/ready");
    const ok = res.ok && body?.status === "ready";
    record(
      "health.ready",
      ok,
      `HTTP ${res.status} status=${body?.status} supabase=${body?.checks?.supabase}`,
    );
  } catch (err) {
    record("health.ready", false, err instanceof Error ? err.message : String(err));
  }

  // 3 — Nexus health (platform mount)
  try {
    const { res, body } = await api("/api/nexus/health");
    record(
      "nexus.health",
      res.ok && body?.status === "ok",
      `HTTP ${res.status}`,
    );
  } catch (err) {
    record("nexus.health", false, err instanceof Error ? err.message : String(err));
  }

  if (!skipAuth && token) {
    // 4 — Auth session
    try {
      const { res, body } = await api("/api/v1/me", { token });
      record("auth.me", res.ok && Boolean(body?.data), `HTTP ${res.status}`);
    } catch (err) {
      record("auth.me", false, err instanceof Error ? err.message : String(err));
    }

    if (instituteId) {
      // 5 — Academic read (students list)
      try {
        const { res, body } = await api(
          `/api/v1/students?institute_id=${instituteId}`,
          { token },
        );
        record(
          "academic.students.list",
          res.status === 200 && Array.isArray(body?.data),
          `HTTP ${res.status}`,
        );
      } catch (err) {
        record(
          "academic.students.list",
          false,
          err instanceof Error ? err.message : String(err),
        );
      }

      // 6 — Subscription / offline invoice surface
      try {
        const { res, body } = await api(
          `/api/v1/subscriptions/current?institute_id=${instituteId}`,
          { token },
        );
        record(
          "billing.subscription.current",
          res.status === 200 && Boolean(body?.data),
          `HTTP ${res.status} plan=${body?.data?.plan ?? "?"}`,
        );
      } catch (err) {
        record(
          "billing.subscription.current",
          false,
          err instanceof Error ? err.message : String(err),
        );
      }

      // Soft write probe — validation failure still proves auth + routing + write-gate path.
      try {
        const { res, body } = await api("/api/v1/students", {
          method: "POST",
          token,
          body: JSON.stringify({ institute_id: instituteId }),
        });
        const acceptable =
          res.status === 400 ||
          res.status === 201 ||
          (res.status === 403 &&
            body?.error?.details?.reason === "SUBSCRIPTION_READ_ONLY");
        record(
          "academic.students.write_path",
          acceptable,
          `HTTP ${res.status} code=${body?.error?.code ?? "ok"}`,
        );
      } catch (err) {
        record(
          "academic.students.write_path",
          false,
          err instanceof Error ? err.message : String(err),
        );
      }
    } else {
      record(
        "academic+billing",
        true,
        "skipped (set SMOKE_INSTITUTE_ID for deeper probes)",
      );
    }
  } else if (!skipAuth) {
    record(
      "auth+domain",
      true,
      "skipped (set SMOKE_ACCESS_TOKEN for authenticated probes)",
    );
  }

  if (!skipFcm) {
    // FCM is process-side; readiness of messaging is inferred from boot logs.
    // Smoke only documents the expectation when Firebase env is present.
    const hasFirebase =
      Boolean(process.env.FIREBASE_PROJECT_ID?.trim()) &&
      Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()) &&
      Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim());
    record(
      "fcm.config",
      hasFirebase,
      hasFirebase
        ? "Firebase env present (worker starts with API process)"
        : "Firebase env missing — FCM worker disabled",
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed`,
  );
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
