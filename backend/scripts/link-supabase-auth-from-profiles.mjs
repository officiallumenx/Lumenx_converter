/**
 * Ops: ensure Supabase Auth users exist for user_profile rows that previously
 * relied on Firebase Auth (firebase_uid) without orphaning memberships.
 *
 * Identity rule: user_profile.id === auth.users.id. Never create a second profile.
 *
 * Dry-run by default. Apply with --apply.
 *
 * Usage (from backend/):
 *   node scripts/link-supabase-auth-from-profiles.mjs
 *   node scripts/link-supabase-auth-from-profiles.mjs --apply
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

const APPLY = process.argv.includes("--apply");

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

function normalizeEmail(email) {
  const v = email?.trim().toLowerCase();
  return v && v.includes("@") ? v : null;
}

function normalizePhoneE164(phone) {
  if (!phone?.trim()) return null;
  const raw = phone.trim();
  if (raw.startsWith("+") && /^\+\d{10,15}$/.test(raw.replace(/\s+/g, ""))) {
    return raw.replace(/\s+/g, "");
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return null;
}

function randomPassword() {
  return `Lx!${randomBytes(24).toString("base64url")}`;
}

async function getAuthUserById(id) {
  const { data, error } = await admin.auth.admin.getUserById(id);
  if (error) {
    const msg = error.message?.toLowerCase() ?? "";
    if (msg.includes("not found") || error.status === 404) return null;
    throw error;
  }
  return data?.user ?? null;
}

async function findAuthUserByEmail(email) {
  // Paginate lightly; ops script for linking, not bulk marketing.
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const users = data?.users ?? [];
    const hit = users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (users.length < 200) break;
  }
  return null;
}

const summary = {
  scanned: 0,
  alreadyLinked: 0,
  wouldCreate: 0,
  created: 0,
  wouldSkipNoContact: 0,
  wouldSkipIdMismatch: 0,
  errors: 0,
};

console.log(
  APPLY
    ? "APPLY mode — will create missing auth.users rows (same id as user_profile)."
    : "DRY-RUN (default) — pass --apply to create missing auth.users.",
);

const { data: profiles, error: listError } = await admin
  .from("user_profile")
  .select("id, email, phone, firebase_uid, display_name, deleted_at")
  .is("deleted_at", null)
  .not("firebase_uid", "is", null)
  .order("id");

if (listError) {
  console.error("Failed to list profiles:", listError.message);
  process.exit(1);
}

for (const profile of profiles ?? []) {
  summary.scanned += 1;
  const email = normalizeEmail(profile.email);
  const phone = normalizePhoneE164(profile.phone);

  try {
    const existing = await getAuthUserById(profile.id);
    if (existing) {
      summary.alreadyLinked += 1;
      continue;
    }

    if (!email && !phone) {
      summary.wouldSkipNoContact += 1;
      console.log(
        `SKIP no-contact profile=${profile.id} firebase_uid=${profile.firebase_uid}`,
      );
      continue;
    }

    if (email) {
      const byEmail = await findAuthUserByEmail(email);
      if (byEmail && byEmail.id !== profile.id) {
        summary.wouldSkipIdMismatch += 1;
        console.log(
          `SKIP email-owned-by-other auth=${byEmail.id} profile=${profile.id} email=${email}`,
        );
        continue;
      }
    }

    const payload = {
      id: profile.id,
      email: email ?? undefined,
      phone: phone ?? undefined,
      email_confirm: Boolean(email),
      phone_confirm: Boolean(phone),
      password: randomPassword(),
      user_metadata: {
        display_name: profile.display_name ?? undefined,
        migrated_from_firebase_uid: profile.firebase_uid,
      },
    };

    if (!APPLY) {
      summary.wouldCreate += 1;
      console.log(
        `WOULD create auth.users id=${profile.id} email=${email ?? "-"} phone=${phone ?? "-"}`,
      );
      continue;
    }

    const { error: createError } = await admin.auth.admin.createUser(payload);
    if (createError) {
      summary.errors += 1;
      console.error(`ERROR create id=${profile.id}: ${createError.message}`);
      continue;
    }
    summary.created += 1;
    console.log(`CREATED auth.users id=${profile.id}`);
  } catch (err) {
    summary.errors += 1;
    console.error(
      `ERROR profile=${profile.id}:`,
      err instanceof Error ? err.message : String(err),
    );
  }
}

console.log("\nSummary:", summary);
if (!APPLY && summary.wouldCreate > 0) {
  console.log("Re-run with --apply to create the listed auth users.");
}
process.exit(summary.errors > 0 ? 1 : 0);
