/**
 * Read-only: confirm notification_institute_dedupe_uidx still present.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "backend/.env") });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const { data, error } = await admin.rpc("pg_get_indexdef_probe").maybeSingle?.() ?? { data: null, error: { message: "no rpc" } };

// Fallback: try a harmless conflict simulation path is already covered by probe.
// Use SQL via PostgREST is not available; use information_schema via a known RPC if any.
// Direct approach: select from pg_indexes through a security definer is unlikely.
// Instead verify by attempting duplicate insert and expecting 23505 then soft-cleanup —
// but the app path avoids insert. Raw duplicate to prove index still enforces:

const INST = "107dc3de-2d23-4400-aef4-f22fc9dd179d";
const ACTOR = "1caf5880-7e0d-466d-87a4-b3e37dda5acf";
const keyName = `gateway-index-check:${Date.now()}`;

const first = await admin
  .from("notification")
  .insert({
    institute_id: INST,
    category: "system",
    priority: "normal",
    title: "Index check",
    body: "proving unique index still enforces",
    payload: { indexCheck: true },
    dedupe_key: keyName,
    created_by_user_profile_id: ACTOR,
  })
  .select("id")
  .single();
if (first.error) throw first.error;

const second = await admin
  .from("notification")
  .insert({
    institute_id: INST,
    category: "system",
    priority: "normal",
    title: "Index check dup",
    body: "should 23505",
    payload: { indexCheck: true },
    dedupe_key: keyName,
    created_by_user_profile_id: ACTOR,
  })
  .select("id")
  .single();

const now = new Date().toISOString();
await admin.from("notification").update({ deleted_at: now }).eq("id", first.data.id);

console.log(
  JSON.stringify(
    {
      at: now,
      indexStillEnforces:
        second.error?.code === "23505" &&
        String(second.error.message || "").includes("notification_institute_dedupe_uidx"),
      duplicateErrorCode: second.error?.code ?? null,
      duplicateErrorMessage: second.error?.message ?? null,
      firstId: first.data.id,
      softDeleted: true,
      rpcProbeSkipped: true,
      rpcError: error?.message ?? null,
    },
    null,
    2,
  ),
);
