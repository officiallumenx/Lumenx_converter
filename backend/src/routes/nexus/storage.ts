import { Hono } from "hono";
import { requireAuth, assertAuthenticated } from "../../auth/require-auth.js";
import type { AppBindings } from "../../types/app.js";
import { AppError } from "../../errors/app-error.js";
import {
  getNetworkStorageSummaryForActor,
  listInstituteStorageUsageForActor,
} from "../../domains/storage/service.js";

const storage = new Hono<AppBindings>();
storage.use("*", requireAuth);

function requireAdmin(c: {
  get: (k: "supabase") => AppBindings["Variables"]["supabase"];
}) {
  const clients = c.get("supabase");
  if (!clients?.admin) {
    throw AppError.internal("Database unavailable");
  }
  return clients.admin;
}

storage.get("/summary", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await getNetworkStorageSummaryForActor(admin, actor);
  return c.json({ data });
});

storage.get("/institutes", async (c) => {
  const actor = assertAuthenticated(c);
  const admin = requireAdmin(c);
  const data = await listInstituteStorageUsageForActor(admin, actor);
  return c.json({ data });
});

export default storage;
