import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.connect",
  appName: "LumenX Connect",
  // Matches the light UI background so cold start / resume don't flash a different color.
  backgroundColor: "#FCFCFD",
});

export default config;
