import { Hono } from "hono";

/**
 * /api/nexus — Platform-level API (structurally separate from institute v1).
 *
 * Nexus routes handle cross-institute and platform administration
 * concerns that do not belong under a single institute's v1 namespace.
 *
 * Planned domain mounts:
 *
 *   nexus.route("/institutes", institutes);   // platform-level institute management
 *   nexus.route("/billing",   billing);       // platform billing
 *   nexus.route("/analytics", analytics);     // cross-institute analytics
 *   nexus.route("/admin",     admin);         // super-admin operations
 */
const nexus = new Hono();

nexus.get("/health", (c) => {
  return c.json({
    service: "lumenx-nexus",
    status: "ok",
    version: "nexus",
  });
});

export default nexus;
