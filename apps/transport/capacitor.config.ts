import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.transport",
  appName: "LumenX Transport",
  // Matches the light UI background so cold start / resume don't flash a different color.
  backgroundColor: "#F8FAFC",
});

export default config;
