import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.admin",
  appName: "LumenX Admin",
  // Matches Admin light surface so cold start / resume don't flash a different color.
  backgroundColor: "#F8FAFC",
  // Must match API CORS_ORIGINS (https://admin.lumenxtech.in) — default localhost is blocked in prod.
  hostname: "admin.lumenxtech.in",
});

export default config;
