/**
 * Read-only audit: diary reminder rows that background ticks still "emit"
 * should already exist with recipients / historical FCM attempts.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "backend/.env") });

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data: rows, error } = await admin
  .from("notification")
  .select("id, institute_id, dedupe_key, title, created_at")
  .like("dedupe_key", "diary-reminder:%")
  .is("deleted_at", null)
  .order("created_at", { ascending: false })
  .limit(20);
if (error) throw error;

const sample = [];
for (const row of rows ?? []) {
  const [{ count: recipients }, attempts] = await Promise.all([
    admin
      .from("notification_recipient")
      .select("id", { count: "exact", head: true })
      .eq("notification_id", row.id)
      .is("deleted_at", null),
    admin
      .from("notification_delivery_attempt")
      .select("id, status, channel, attempted_at, error")
      .eq("notification_id", row.id)
      .order("attempted_at", { ascending: false })
      .limit(5),
  ]);
  if (attempts.error) throw attempts.error;
  sample.push({
    id: row.id,
    dedupe_key: row.dedupe_key,
    created_at: row.created_at,
    recipients: recipients ?? 0,
    attemptStatuses: (attempts.data ?? []).map((a) => a.status),
    attemptChannels: [...new Set((attempts.data ?? []).map((a) => a.channel))],
  });
}

const withRecipients = sample.filter((s) => s.recipients > 0).length;
const withSent = sample.filter((s) => s.attemptStatuses.includes("sent")).length;
const emptyRecipients = sample.filter((s) => s.recipients === 0);

console.log(
  JSON.stringify(
    {
      at: new Date().toISOString(),
      liveDiaryRemindersTotalProbeLimit: sample.length,
      withRecipients,
      withSentAttempt: withSent,
      emptyRecipientCount: emptyRecipients.length,
      emptyRecipientKeys: emptyRecipients.map((s) => s.dedupe_key).slice(0, 5),
      sample: sample.slice(0, 8),
    },
    null,
    2,
  ),
);
