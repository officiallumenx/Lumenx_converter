/**
 * Invalidate hidden Supabase Auth passwords for Connect-only identities.
 *
 * What this does
 * --------------
 * Connect parent/teacher/student login is passwordless (Firebase phone OTP + PIN
 * on first login; mobile + PIN on return). Historical provisioning often created
 * Auth users with an app-supplied or random password. This script rotates those
 * Auth passwords to a strong random unusable value via the Admin API so password
 * sign-in cannot succeed for Connect-only accounts.
 *
 * Safety rules (mixed-use identities are never touched)
 * -----------------------------------------------------
 * A user_profile is rotated ONLY when ALL of the following hold:
 *   1. It is linked to Connect usage: parent / teacher / student directory row,
 *      connect_login_credential, or membership roles in the Connect set
 *      (teacher, class_teacher, parent, student, learner).
 *   2. It is NOT a Nexus platform_operator.
 *   3. It does NOT have an Admin membership_access_assignment.
 *   4. It has NO membership roles outside the Connect set above
 *      (e.g. institute_admin, principal, staff used for Admin ACL, accountant…).
 *
 * Identities shared with Admin, Nexus, or other password-based apps are skipped.
 *
 * What was changed alongside this helper
 * --------------------------------------
 * - parents/provision.ts: createUser prefers passwordless; optional Admin password
 *   only for non-Connect callers; parent provision no longer accepts passwords.
 * - parents/parent-login.ts + auth-credentials/connect-login.ts: passwordless create.
 * - routes/v1/parents.ts: removed password from create / provision-access.
 * - access-roles: Admin assignee password path kept (not Connect provisioning).
 * - Teacher/student directory create paths never provisioned Auth passwords.
 *
 * Usage (from backend/)
 * ---------------------
 *   # Dry-run (default) — lists candidates, rotates nothing
 *   node scripts/invalidate-connect-only-auth-passwords.mjs
 *
 *   # Apply rotations
 *   node scripts/invalidate-connect-only-auth-passwords.mjs --apply
 *
 *   # Or via package script:
 *   npm run auth:invalidate-connect-passwords
 *   npm run auth:invalidate-connect-passwords -- --apply
 *
 * Env (backend/.env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Never prints passwords or secrets.
 */

import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

loadDotenv({ path: join(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

function requireEnv(name) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const APPLY = process.argv.includes("--apply");
const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_SERVICE = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

/** Membership roles that count as Connect portal usage. */
const CONNECT_ROLES = new Set([
  "teacher",
  "class_teacher",
  "parent",
  "student",
  "learner",
]);

/**
 * `staff` alone is ambiguous (Admin assignees also get it). Allowed only when the
 * profile is directory-linked as teacher/parent/student or already has a Connect
 * credential, and never when an access assignment exists.
 */
const AMBIGUOUS_STAFF = "staff";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function fetchAll(table, columns, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await admin.from(table).select(columns).range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

async function fetchAllFiltered(table, columns, applyFilter, pageSize = 1000) {
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    let query = admin.from(table).select(columns);
    query = applyFilter(query);
    const { data, error } = await query.range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

function unusablePassword() {
  return randomBytes(48).toString("base64url");
}

async function main() {
  console.log(
    APPLY
      ? "Mode: APPLY — will rotate Auth passwords for Connect-only identities"
      : "Mode: DRY-RUN — pass --apply to rotate (no changes otherwise)",
  );

  const profiles = await fetchAllFiltered(
    "user_profile",
    "id, email, display_name, status",
    (q) => q.is("deleted_at", null),
  );

  const memberships = await fetchAllFiltered(
    "membership",
    "id, user_id, status",
    (q) => q.is("deleted_at", null),
  );

  const membershipRoles = await fetchAll("membership_role", "membership_id, role_code");

  const operators = await fetchAllFiltered(
    "platform_operator",
    "user_id",
    (q) => q.is("deleted_at", null),
  );

  const accessAssignments = await fetchAllFiltered(
    "membership_access_assignment",
    "membership_id",
    (q) => q.is("deleted_at", null),
  );

  const parents = await fetchAllFiltered(
    "parent",
    "user_profile_id",
    (q) => q.is("deleted_at", null).not("user_profile_id", "is", null),
  );

  const teachers = await fetchAllFiltered(
    "teacher",
    "user_profile_id",
    (q) => q.is("deleted_at", null).not("user_profile_id", "is", null),
  );

  const students = await fetchAllFiltered(
    "student",
    "user_profile_id",
    (q) => q.is("deleted_at", null).not("user_profile_id", "is", null),
  );

  let connectCredentials = [];
  try {
    connectCredentials = await fetchAll("connect_login_credential", "user_profile_id");
  } catch {
    console.warn(
      "connect_login_credential not readable yet — continuing with membership/directory signals only.",
    );
  }

  const rolesByMembership = new Map();
  for (const row of membershipRoles) {
    const list = rolesByMembership.get(row.membership_id) ?? [];
    list.push(row.role_code);
    rolesByMembership.set(row.membership_id, list);
  }

  const membershipsByUser = new Map();
  for (const m of memberships) {
    const list = membershipsByUser.get(m.user_id) ?? [];
    list.push(m);
    membershipsByUser.set(m.user_id, list);
  }

  const operatorIds = new Set(operators.map((o) => o.user_id).filter(Boolean));
  const assignedMembershipIds = new Set(
    accessAssignments.map((a) => a.membership_id).filter(Boolean),
  );

  const connectLinked = new Set();
  for (const row of parents) if (row.user_profile_id) connectLinked.add(row.user_profile_id);
  for (const row of teachers) if (row.user_profile_id) connectLinked.add(row.user_profile_id);
  for (const row of students) if (row.user_profile_id) connectLinked.add(row.user_profile_id);
  for (const row of connectCredentials) {
    if (row.user_profile_id) connectLinked.add(row.user_profile_id);
  }

  const candidates = [];
  const skipped = {
    operator: 0,
    accessAssignment: 0,
    nonConnectRole: 0,
    noConnectSignal: 0,
  };

  for (const profile of profiles) {
    const userId = profile.id;
    if (operatorIds.has(userId)) {
      skipped.operator += 1;
      continue;
    }

    const userMemberships = membershipsByUser.get(userId) ?? [];
    const roleCodes = new Set();
    let hasAccessAssignment = false;
    for (const m of userMemberships) {
      if (assignedMembershipIds.has(m.id)) hasAccessAssignment = true;
      for (const code of rolesByMembership.get(m.id) ?? []) {
        roleCodes.add(code);
      }
    }

    if (hasAccessAssignment) {
      skipped.accessAssignment += 1;
      continue;
    }

    const hasAdminMarkerRole = [...roleCodes].some(
      (code) => !CONNECT_ROLES.has(code) && code !== AMBIGUOUS_STAFF,
    );
    if (hasAdminMarkerRole) {
      skipped.nonConnectRole += 1;
      continue;
    }

    const hasConnectRole = [...roleCodes].some((code) => CONNECT_ROLES.has(code));
    const linked = connectLinked.has(userId);
    const staffOnly =
      roleCodes.size > 0 &&
      [...roleCodes].every((code) => code === AMBIGUOUS_STAFF);

    if (!hasConnectRole && !linked) {
      skipped.noConnectSignal += 1;
      continue;
    }
    if (staffOnly && !linked) {
      skipped.noConnectSignal += 1;
      continue;
    }

    candidates.push({
      userId,
      email: profile.email ?? null,
      displayName: profile.display_name ?? null,
      roles: [...roleCodes].sort(),
    });
  }

  console.log(`Profiles scanned: ${profiles.length}`);
  console.log(`Connect-only candidates: ${candidates.length}`);
  console.log(
    `Skipped — operators=${skipped.operator}, access_assignments=${skipped.accessAssignment}, non_connect_roles=${skipped.nonConnectRole}, no_connect_signal=${skipped.noConnectSignal}`,
  );

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const preview = candidates.slice(0, 20).map((c) => ({
    id: c.userId,
    email: c.email,
    roles: c.roles.join("|") || "(directory-link-only)",
  }));
  console.log("Sample candidates (up to 20):");
  console.table(preview);

  if (!APPLY) {
    console.log("Dry-run complete. Re-run with --apply to rotate passwords.");
    return;
  }

  let ok = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const { error } = await admin.auth.admin.updateUserById(candidate.userId, {
      password: unusablePassword(),
    });
    if (error) {
      failed += 1;
      console.error(`Failed ${candidate.userId}: ${error.message}`);
      continue;
    }
    ok += 1;
  }

  console.log(`Rotated: ${ok}; failed: ${failed}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
