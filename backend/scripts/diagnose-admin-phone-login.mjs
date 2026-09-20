import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function maskEmail(e) {
  if (!e) return null;
  const [u, d] = e.split("@");
  if (!d) return "***";
  return `${(u.slice(0, 2) || "*")}***@${d}`;
}

function maskPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, "");
  if (d.length < 4) return "***";
  return `${"*".repeat(Math.max(0, d.length - 4))}${d.slice(-4)}`;
}

const env = loadEnv(join(root, ".env"));
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log(
    JSON.stringify({
      ok: false,
      reason: "missing_supabase_env",
      hasUrl: Boolean(url),
      hasKey: Boolean(key),
    }),
  );
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const institutes = await admin
  .from("institute")
  .select("id,name,status,code")
  .is("deleted_at", null)
  .order("name");
if (institutes.error) throw institutes.error;

const profiles = await admin
  .from("user_profile")
  .select("id,email,phone,phone_digits,status")
  .is("deleted_at", null)
  .limit(100);
if (profiles.error) throw profiles.error;

const memberships = await admin
  .from("membership")
  .select("id,user_id,institute_id,status")
  .is("deleted_at", null)
  .limit(200);
if (memberships.error) throw memberships.error;

const roles = await admin
  .from("membership_role")
  .select("membership_id,role_code")
  .limit(200);
if (roles.error) throw roles.error;

const roleByMembership = new Map();
for (const r of roles.data || []) {
  const list = roleByMembership.get(r.membership_id) || [];
  list.push(r.role_code);
  roleByMembership.set(r.membership_id, list);
}

const membershipsByUser = new Map();
for (const m of memberships.data || []) {
  const list = membershipsByUser.get(m.user_id) || [];
  list.push({
    institute_id_tail: String(m.institute_id).slice(-8),
    status: m.status,
    roles: roleByMembership.get(m.id) || [],
  });
  membershipsByUser.set(m.user_id, list);
}

const profileRows = (profiles.data || []).map((p) => {
  const digitsFromPhone = p.phone
    ? String(p.phone).replace(/\D/g, "").slice(-10)
    : null;
  const phoneDigitsOk = Boolean(
    p.phone_digits && /^\d{10}$/.test(p.phone_digits),
  );
  const syncOk = Boolean(
    p.phone_digits && digitsFromPhone && p.phone_digits === digitsFromPhone,
  );
  return {
    email: maskEmail(p.email),
    status: p.status,
    has_phone: Boolean(p.phone),
    phone_tail: maskPhone(p.phone),
    has_phone_digits: Boolean(p.phone_digits),
    phone_digits_tail: maskPhone(p.phone_digits),
    phone_digits_valid_10: phoneDigitsOk,
    phone_vs_digits_sync: syncOk,
    memberships: membershipsByUser.get(p.id) || [],
  };
});

const withMembership = profileRows.filter((p) => p.memberships.length > 0);
const mobileLoginReady = withMembership.filter(
  (p) => p.has_phone && p.phone_digits_valid_10 && p.phone_vs_digits_sync,
);
const mobileBroken = withMembership.filter(
  (p) => !p.has_phone || !p.phone_digits_valid_10 || !p.phone_vs_digits_sync,
);

console.log(
  JSON.stringify(
    {
      ok: true,
      project_host: new URL(url).host,
      institutes: (institutes.data || []).map((i) => ({
        name: i.name,
        status: i.status,
        code: i.code,
        id_tail: String(i.id).slice(-8),
      })),
      profile_count: profileRows.length,
      membership_count: (memberships.data || []).length,
      admins_with_membership: withMembership.length,
      mobile_login_ready_count: mobileLoginReady.length,
      mobile_login_broken: mobileBroken,
      mobile_login_ready_sample: mobileLoginReady.slice(0, 5),
    },
    null,
    2,
  ),
);
