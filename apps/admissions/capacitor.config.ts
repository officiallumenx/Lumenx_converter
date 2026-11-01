import { createCapacitorConfig } from "@lumenx/capacitor/config";

const config = createCapacitorConfig({
  appId: "com.lumenx.app.admissions",
  appName: "LumenX Admissions",
  backgroundColor: "#FCFCFD",
  // Standalone host when public; until then Connect admissions entry still works in browser.
  hostname: "admissions.lumenxtech.in",
});

export default config;
