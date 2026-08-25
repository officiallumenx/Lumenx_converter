import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/**
 * Capacitor build for LumenX Admin.
 * Web dev/SSR/deploy continues to use vite.config.ts unchanged.
 */
export default createViteCapacitorConfig({
  appKey: "admin",
  optimizeDepsInclude: ["recharts", "xlsx"],
  vite: {
    server: {
      port: 8081,
      strictPort: false,
    },
  },
});
