/**
 * Prints presence of staging env keys only — never secret values.
 */
import fs from "node:fs";

const p = "backend/.env.staging";
if (!fs.existsSync(p)) {
  console.log("MISSING_ENV");
  process.exit(0);
}
const t = fs.readFileSync(p, "utf8");
const get = (k) => {
  const m = t.match(new RegExp(`^${k}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};
console.log("LUMENX_ENV=" + (get("LUMENX_ENV") || "EMPTY"));
console.log(
  "STAGING_CONFIRMED=" +
    (get("STAGING_CONFIRMED") ? "SET_MATCH_LEN_" + get("STAGING_CONFIRMED").length : "EMPTY"),
);
console.log(
  "STAGING_SUPABASE_PROJECT_REF=" + (get("STAGING_SUPABASE_PROJECT_REF") || "EMPTY"),
);
try {
  console.log("SUPABASE_URL_HOST=" + new URL(get("SUPABASE_URL")).hostname);
} catch {
  console.log("SUPABASE_URL_HOST=PARSE_FAIL");
}
console.log("HAS_ANON=" + Boolean(get("SUPABASE_ANON_KEY")));
console.log("HAS_SERVICE=" + Boolean(get("SUPABASE_SERVICE_ROLE_KEY")));
console.log(
  "DENYLIST_HAS_PROD=" +
    get("PRODUCTION_SUPABASE_PROJECT_REF_DENYLIST").includes("kmpzflsurepjwqnfqyld"),
);
