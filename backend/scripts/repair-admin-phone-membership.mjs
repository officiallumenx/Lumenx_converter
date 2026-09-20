/**
 * Repair Admin mobile login when phone sits on a non-member profile
 * while the institute Admin (email) has membership but no phone.
 *
 * Usage (from backend/):
 *   node scripts/repair-admin-phone-membership.mjs --email you@school.com --phone 9876543210
 *   node scripts/repair-admin-phone-membership.mjs --dry-run --email you@school.com --phone 9876543210
 *
 * Requires backend/.env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (current key).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

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

function parseArgs(argv) {
  const out = { dryRun: false, email: "", phone: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--email") out.email = String(argv[++i] || "").trim();
    else if (a === "--phone") out.phone = String(argv[++i] || "").trim();
  }
  return out;
}

function digits10(value) {
  const d = String(value || "").replace(/\D/g, "");
  return d.length >= 10 ? d.slice(-10) : "";
}

const args = parseArgs(process.argv.slice(2));
const phoneDigits = digits10(args.phone);
const email = args.email.trim().toLowerCase();

if (!email || !/^\d{10}$/.test(phoneDigits)) {
  console.error(
    "Usage: node scripts/repair-admin-phone-membership.mjs --email you@school.com --phone 9876543210 [--dry-run]",
  );
  process.exit(1);
}

const env = loadEnv(join(root, ".env"));
const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: emailProfiles, error: emailErr } = await admin
  .from("user_profile")
  .select("id, email, phone, phone_digits, status")
  .ilike("email", email)
  .is("deleted_at", null);
if (emailErr) throw emailErr;

if (!emailProfiles?.length) {
  console.error(JSON.stringify({ ok: false, reason: "email_profile_not_found", email }));
  process.exit(1);
}
if (emailProfiles.length > 1) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "multiple_email_profiles",
      count: emailProfiles.length,
    }),
  );
  process.exit(1);
}

const target = emailProfiles[0];

const { data: memberships, error: memErr } = await admin
  .from("membership")
  .select("id, institute_id, status")
  .eq("user_id", target.id)
  .is("deleted_at", null);
if (memErr) throw memErr;

const activeMemberships = (memberships || []).filter((m) => m.status !== "ended");
if (activeMemberships.length === 0) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "email_profile_has_no_membership",
      user_id: target.id,
    }),
  );
  process.exit(1);
}

const { data: phoneHolders, error: phoneErr } = await admin
  .from("user_profile")
  .select("id, email, phone, phone_digits, status")
  .is("deleted_at", null)
  .or(
    `phone_digits.eq.${phoneDigits},phone.eq.${phoneDigits},phone.eq.+91${phoneDigits},phone.ilike.%${phoneDigits}%`,
  );
if (phoneErr) throw phoneErr;

const holders = (phoneHolders || []).filter((row) => {
  if (row.phone_digits === phoneDigits) return true;
  if (!row.phone) return false;
  return digits10(row.phone) === phoneDigits;
});

const others = holders.filter((row) => row.id !== target.id);

const plan = {
  ok: true,
  dryRun: args.dryRun,
  target: {
    id: target.id,
    email: target.email,
    phone_before: target.phone,
    phone_digits_before: target.phone_digits,
  },
  membership_institute_ids: activeMemberships.map((m) => m.institute_id),
  clear_from: others.map((row) => ({
    id: row.id,
    email: row.email,
    phone: row.phone,
    phone_digits: row.phone_digits,
  })),
  set_on_target: { phone: phoneDigits, phone_digits: phoneDigits },
};

if (args.dryRun) {
  console.log(JSON.stringify({ ...plan, applied: false }, null, 2));
  process.exit(0);
}

const { error: clearErr } = await admin
  .from("user_profile")
  .update({ phone: null, phone_digits: null })
  .in(
    "id",
    others.map((row) => row.id),
  );
if (others.length && clearErr) throw clearErr;

const { error: setErr } = await admin
  .from("user_profile")
  .update({ phone: phoneDigits, phone_digits: phoneDigits })
  .eq("id", target.id);
if (setErr) throw setErr;

const { data: after, error: afterErr } = await admin
  .from("user_profile")
  .select("id, email, phone, phone_digits, status")
  .eq("id", target.id)
  .maybeSingle();
if (afterErr) throw afterErr;

console.log(
  JSON.stringify(
    {
      ...plan,
      applied: true,
      target_after: after,
    },
    null,
    2,
  ),
);
