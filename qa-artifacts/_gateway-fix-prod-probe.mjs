/**
 * Read-mostly production probe for gateway-fix deploy.
 * Creates one disposable notification (unique dedupe key) then replays insert.
 * Soft-deletes the probe row afterward. No index changes.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "backend/.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const INST = "107dc3de-2d23-4400-aef4-f22fc9dd179d";
const ACTOR = "1caf5880-7e0d-466d-87a4-b3e37dda5acf";
const keyName = `gateway-fix-probe:${Date.now()}`;

async function insertOnce() {
  // Pre-read
  const existing = await admin
    .from("notification")
    .select("id, dedupe_key, created_at")
    .eq("institute_id", INST)
    .eq("dedupe_key", keyName)
    .is("deleted_at", null)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) return { notification: existing.data, created: false };

  const inserted = await admin
    .from("notification")
    .insert({
      institute_id: INST,
      category: "system",
      priority: "normal",
      title: "Gateway fix probe",
      body: "Idempotent insert verification — safe to ignore",
      payload: { probe: true },
      dedupe_key: keyName,
      created_by_user_profile_id: ACTOR,
    })
    .select("id, dedupe_key, created_at")
    .single();

  if (inserted.error) {
    if (String(inserted.error.code) === "23505") {
      const raced = await admin
        .from("notification")
        .select("id, dedupe_key, created_at")
        .eq("institute_id", INST)
        .eq("dedupe_key", keyName)
        .is("deleted_at", null)
        .maybeSingle();
      if (raced.data) return { notification: raced.data, created: false };
    }
    throw inserted.error;
  }
  return { notification: inserted.data, created: true };
}

const health = await fetch("https://api.lumenxtech.in/api/v1/health/ready").then((r) =>
  r.json(),
);
const first = await insertOnce();
const second = await insertOnce();

let recipientCount = 0;
if (first.created) {
  const rec = await admin
    .from("notification_recipient")
    .insert({
      institute_id: INST,
      notification_id: first.notification.id,
      user_profile_id: ACTOR,
    })
    .select("id")
    .single();
  if (rec.error) throw rec.error;
  recipientCount = 1;
} else {
  const { count } = await admin
    .from("notification_recipient")
    .select("id", { count: "exact", head: true })
    .eq("notification_id", first.notification.id)
    .is("deleted_at", null);
  recipientCount = count ?? 0;
}

const { count: rowCount } = await admin
  .from("notification")
  .select("id", { count: "exact", head: true })
  .eq("dedupe_key", keyName)
  .is("deleted_at", null);

// Soft-delete probe notification + recipient
const now = new Date().toISOString();
await admin
  .from("notification_recipient")
  .update({ deleted_at: now })
  .eq("notification_id", first.notification.id)
  .is("deleted_at", null);
await admin
  .from("notification")
  .update({ deleted_at: now })
  .eq("id", first.notification.id);

const out = {
  at: now,
  apiReady: health,
  probeKey: keyName,
  firstCreated: first.created,
  secondCreated: second.created,
  sameId: first.notification.id === second.notification.id,
  liveRowCountBeforeDelete: rowCount,
  recipientInsertedOrExisting: recipientCount,
};
console.log(JSON.stringify(out, null, 2));
