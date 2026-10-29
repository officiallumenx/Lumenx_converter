/**
 * Read-only production metrics for gateway-fix post-deploy windows.
 * Soft-delete nothing except optional unused. No schema changes.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "backend/.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const now = Date.now();
const windows = {
  m30: new Date(now - 30 * 60_000).toISOString(),
  m60: new Date(now - 60 * 60_000).toISOString(),
  h24: new Date(now - 24 * 60 * 60_000).toISOString(),
  deployApprox: "2026-10-29T13:20:00.000Z", // ~commit/deploy window IST 18:45–19:00 → UTC
};

async function count(table, filters) {
  let q = admin.from(table).select("id", { count: "exact", head: true });
  for (const [op, args] of filters) {
    q = q[op](...args);
  }
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

const out = {
  at: new Date().toISOString(),
  supabaseHost: new URL(url).host,
  windows,
  notificationsCreated: {
    last30m: await count("notification", [
      ["gte", ["created_at", windows.m30]],
      ["is", ["deleted_at", null]],
    ]),
    last60m: await count("notification", [
      ["gte", ["created_at", windows.m60]],
      ["is", ["deleted_at", null]],
    ]),
    last24h: await count("notification", [
      ["gte", ["created_at", windows.h24]],
      ["is", ["deleted_at", null]],
    ]),
    sinceDeployApprox: await count("notification", [
      ["gte", ["created_at", windows.deployApprox]],
      ["is", ["deleted_at", null]],
    ]),
  },
  diaryReminderLive: await count("notification", [
    ["like", ["dedupe_key", "diary-reminder:%"]],
    ["is", ["deleted_at", null]],
  ]),
  recipientsCreated: {
    last60m: await count("notification_recipient", [
      ["gte", ["created_at", windows.m60]],
      ["is", ["deleted_at", null]],
    ]),
    sinceDeployApprox: await count("notification_recipient", [
      ["gte", ["created_at", windows.deployApprox]],
      ["is", ["deleted_at", null]],
    ]),
  },
  fcmAttempts: {
    pending: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "pending"]],
    ]),
    sending: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "sending"]],
    ]),
    sentLast60m: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "sent"]],
      ["gte", ["attempted_at", windows.m60]],
    ]),
    failedLast60m: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "failed"]],
      ["gte", ["attempted_at", windows.m60]],
    ]),
    sentSinceDeploy: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "sent"]],
      ["gte", ["attempted_at", windows.deployApprox]],
    ]),
    failedSinceDeploy: await count("notification_delivery_attempt", [
      ["eq", ["channel", "fcm"]],
      ["eq", ["status", "failed"]],
      ["gte", ["attempted_at", windows.deployApprox]],
    ]),
  },
};

// Sample recent notifications (titles only) to confirm legitimate traffic
const recent = await admin
  .from("notification")
  .select("id, category, title, dedupe_key, created_at")
  .is("deleted_at", null)
  .gte("created_at", windows.m60)
  .order("created_at", { ascending: false })
  .limit(10);
if (recent.error) throw recent.error;
out.recentNotificationsSample = recent.data;

console.log(JSON.stringify(out, null, 2));
