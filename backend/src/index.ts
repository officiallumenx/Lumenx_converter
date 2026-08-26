import { config as loadDotenv } from "dotenv";
loadDotenv();

import { serve } from "@hono/node-server";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";
import { createLogger } from "./logger/logger.js";

const env = loadEnv();
const logger = createLogger(env.LOG_LEVEL);
const app = createApp(env, logger);

serve({ fetch: app.fetch, port: env.PORT, hostname: env.HOST }, (info) => {
  logger.info({
    msg: "server_started",
    host: env.HOST,
    port: info.port,
    env: env.NODE_ENV,
  });
});
