import { config as loadDotenv } from "dotenv";
loadDotenv();

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { assertProductionEnv } from "./config/production.js";
import { createLogger } from "./logger/logger.js";
import { createSupabaseClients } from "./integrations/supabase.js";
import { getFirebaseMessaging, initFirebaseAdmin } from "./integrations/firebase.js";
import {
  FCM_WORKER_DEFAULT_BATCH,
  FCM_WORKER_DEFAULT_INTERVAL_MS,
  startFcmWorkerLoop,
} from "./workers/fcm-worker-runner.js";
import { startSubscriptionLifecycleLoop } from "./workers/subscription-lifecycle-runner.js";
import { startBackgroundJobsLoop } from "./workers/background-jobs-runner.js";

const env = loadEnv();
assertProductionEnv(env, process.env as Record<string, string | undefined>);
const logger = createLogger(env.LOG_LEVEL);
const supabase = createSupabaseClients(env, logger);
const firebaseApp = initFirebaseAdmin(env, logger);
const workerEnabled = env.FCM_WORKER_ENABLED !== false;
const messaging = workerEnabled ? getFirebaseMessaging(firebaseApp) : null;

if (env.NODE_ENV === "production" && workerEnabled) {
  if (!firebaseApp || !messaging || !supabase?.admin) {
    logger.error({
      msg: "fcm_worker_startup_failed",
      workerEnabled: true,
      firebaseConfigured: Boolean(firebaseApp),
      messagingConfigured: Boolean(messaging),
      supabaseConfigured: Boolean(supabase?.admin),
      projectId: env.FIREBASE_PROJECT_ID ?? null,
      hint: "Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and Supabase, or set FCM_WORKER_ENABLED=false to disable push intentionally.",
    });
    process.exit(1);
  }
}

const app = createApp(env, logger, supabase, firebaseApp);
if (supabase?.admin && messaging) {
  startFcmWorkerLoop({
    admin: supabase.admin,
    messaging,
    logger,
    intervalMs: FCM_WORKER_DEFAULT_INTERVAL_MS,
    batchSize: FCM_WORKER_DEFAULT_BATCH,
  });
  logger.info({
    msg: "fcm_worker_started",
    workerEnabled: true,
    projectId: env.FIREBASE_PROJECT_ID ?? null,
    intervalMs: FCM_WORKER_DEFAULT_INTERVAL_MS,
    batchSize: FCM_WORKER_DEFAULT_BATCH,
  });
} else {
  logger.warn({
    msg: "fcm_worker_disabled",
    workerEnabled,
    firebaseConfigured: Boolean(firebaseApp),
    projectId: env.FIREBASE_PROJECT_ID ?? null,
    hint: "Configure Firebase credentials and Supabase to enable FCM delivery (or set FCM_WORKER_ENABLED=true).",
  });
}

if (supabase?.admin) {
  startSubscriptionLifecycleLoop({
    admin: supabase.admin,
    logger,
    intervalMs: env.SUBSCRIPTION_LIFECYCLE_SYNC_MS,
  });
  logger.info({
    msg: "subscription_lifecycle_worker_started",
    intervalMs: env.SUBSCRIPTION_LIFECYCLE_SYNC_MS,
  });

  startBackgroundJobsLoop({
    admin: supabase.admin,
    logger,
    intervalMs: env.BACKGROUND_JOBS_INTERVAL_MS,
  });
  logger.info({
    msg: "background_jobs_worker_started",
    intervalMs: env.BACKGROUND_JOBS_INTERVAL_MS,
  });
} else {
  logger.warn({
    msg: "subscription_lifecycle_worker_disabled",
    hint: "Configure Supabase to enable commercial lifecycle sync.",
  });
  logger.warn({
    msg: "background_jobs_worker_disabled",
    hint: "Configure Supabase to enable announcement/alert/diary workers.",
  });
}

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  logger.info({
    msg: "server_started",
    host: env.HOST,
    port: info.port,
    env: env.NODE_ENV,
    supabase: supabase ? "configured" : "not_configured",
    firebase: firebaseApp ? "configured" : "not_configured",
    fcm: messaging ? "enabled" : "disabled",
    subscriptionLifecycleMs: env.SUBSCRIPTION_LIFECYCLE_SYNC_MS,
    backgroundJobsMs: env.BACKGROUND_JOBS_INTERVAL_MS,
  });
});
