import { config as loadDotenv } from "dotenv";
loadDotenv();

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./logger/logger.js";
import { createSupabaseClients } from "./integrations/supabase.js";
import { getFirebaseMessaging, initFirebaseAdmin } from "./integrations/firebase.js";
import { startFcmWorkerLoop } from "./workers/fcm-worker-runner.js";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const supabase = createSupabaseClients(env, logger);
const app = createApp(env, logger, supabase);

const firebaseApp = initFirebaseAdmin(env, logger);
const messaging = getFirebaseMessaging(firebaseApp);
if (supabase?.admin && messaging) {
  startFcmWorkerLoop({ admin: supabase.admin, messaging, logger });
  logger.info({ msg: "fcm_worker_started" });
} else {
  logger.warn({
    msg: "fcm_worker_disabled",
    hint: "Configure Firebase credentials and Supabase to enable FCM delivery.",
  });
}

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  logger.info({
    msg: "server_started",
    host: env.HOST,
    port: info.port,
    env: env.NODE_ENV,
    supabase: supabase ? "configured" : "not_configured",
    fcm: messaging ? "enabled" : "disabled",
  });
});
