import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.transport",
  appName: "LumenX Transport",
  // Matches the light UI background so cold start / resume don't flash a different color.
  backgroundColor: "#F8FAFC",
  // Must match API CORS_ORIGINS — default localhost is blocked in prod.
  hostname: "transport.lumenxtech.in",
});

config.plugins = {
  ...config.plugins,
  CapacitorHttp: {
    enabled: true,
  },
} as any;

export default config;
