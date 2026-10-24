import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/** Capacitor build for LumenX Nexus. Web SSR/deploy uses vite.config.ts. */
export default createViteCapacitorConfig({
  appKey: "nexus",
  optimizeDepsInclude: ["sonner"],
  vite: {
    server: {
      port: 8082,
      strictPort: false,
    },
  },
});
