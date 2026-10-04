import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.connect",
  appName: "Connect",
  // Matches the light UI background so cold start / resume don't flash a different color.
  backgroundColor: "#FCFCFD",
  // Must match API CORS_ORIGINS (https://connect.lumenxtech.in) — default localhost is blocked in prod.
  hostname: "connect.lumenxtech.in",
});

export default config;
