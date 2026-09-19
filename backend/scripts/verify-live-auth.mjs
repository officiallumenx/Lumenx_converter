import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const enabled = process.env.LIVE_AUTH_VERIFY === "1";
const smsReportRequested = process.argv.includes("--sms-prerequisites");

function present(name) {
  return Boolean(process.env[name]?.trim());
}

function report(name, ok, detail) {
  console.log(`${ok ? "PASS" : "BLOCKED"} ${name}: ${detail}`);
}

const supabaseReady = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
].every(present);
const firebaseReady = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
].every(present);

if (!enabled) {
  console.log(
    "SKIP live auth verification: set LIVE_AUTH_VERIFY=1 to run read-only Firebase and Supabase checks.",
  );
  report(
    "Supabase prerequisites",
    supabaseReady,
    supabaseReady
      ? "URL and service role key are present"
      : "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
  report(
    "Firebase prerequisites",
    firebaseReady,
    firebaseReady
      ? "Admin credentials are present"
      : "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required",
  );
} else {
  let failed = false;

  if (!supabaseReady) {
    report(
      "Supabase Auth",
      false,
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
    );
    failed = true;
  } else {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );
      const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw error;
      report("Supabase Auth", true, "read-only admin lookup succeeded");
    } catch (error) {
      report("Supabase Auth", false, error instanceof Error ? error.message : String(error));
      failed = true;
    }
  }

  if (!firebaseReady) {
    report(
      "Firebase Auth",
      false,
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required",
    );
    failed = true;
  } else {
    let app;
    try {
      app = initializeApp(
        {
          credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
          }),
        },
        `lumenx-live-auth-check-${process.pid}`,
      );
      await getAuth(app).listUsers(1);
      report("Firebase Auth", true, "read-only user lookup succeeded");
    } catch (error) {
      report("Firebase Auth", false, error instanceof Error ? error.message : String(error));
      failed = true;
    } finally {
      if (app) await deleteApp(app);
    }
  }

  if (failed) process.exitCode = 2;
}

if (smsReportRequested) {
  const blaze = process.env.FIREBASE_BILLING_PLAN?.trim().toLowerCase() === "blaze";
  const domains = (process.env.FIREBASE_AUTHORIZED_DOMAINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const destinationPresent = present("LIVE_SMS_DESTINATION");
  report(
    "Real SMS prerequisites",
    blaze && domains.length > 0 && destinationPresent,
    [
      blaze ? "Blaze confirmed" : "set FIREBASE_BILLING_PLAN=blaze",
      domains.length > 0
        ? `${domains.length} authorized domain(s) declared`
        : "set FIREBASE_AUTHORIZED_DOMAINS",
      destinationPresent
        ? "authorized destination declared"
        : "set LIVE_SMS_DESTINATION to an approved test number",
    ].join("; "),
  );
  console.log(
    "SAFE: this verifier never sends SMS. Use a separately approved manual journey after all prerequisites pass.",
  );
}
