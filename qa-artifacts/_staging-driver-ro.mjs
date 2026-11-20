import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[line.slice(0, i).trim()] = v;
  }
  return out;
}

const env = loadEnv("backend/.env.staging");
const ref = (env.SUPABASE_URL.match(/https?:\/\/([^.]+)/) || [])[1];
if (ref !== "yveadybpntziyryxsrsu") {
  console.error("ABORT");
  process.exit(2);
}
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const DRIVER_ID = "4b533f2c-2791-4a8d-9b98-681326506f39";
const INST = "32e6db7a-e8c5-4b42-984d-a70c653d10a2";
const { data: driver, error } = await sb
  .from("driver")
  .select("id,user_profile_id,status,deleted_at,institute_id")
  .eq("id", DRIVER_ID)
  .maybeSingle();
console.log(JSON.stringify({ error: error?.message || null, driver }, null, 2));
const { data: parents } = await sb
  .from("parent")
  .select("id,email,phone,deleted_at,access_status")
  .eq("institute_id", INST);
console.log(
  "parents:",
  JSON.stringify(
    (parents || []).map((p) => ({
      id: p.id,
      email: p.email,
      deleted: Boolean(p.deleted_at),
      access: p.access_status,
    })),
  ),
);
console.log(
  "keystore.properties",
  existsSync("apps/transport/android/keystore.properties"),
);
console.log(
  "accounts:",
  JSON.stringify({
    driver_email: "smoke.staging.transport.rt.driver@lumenx.test",
    parent_email: "smoke.staging.transport.rt.parent@lumenx.test",
    driver_phone: "9000000294",
    parent_phone: "9000000295",
  }),
);
