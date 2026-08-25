import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/**
 * Capacitor + future PWA build for LumenX Transport.
 * Web dev/SSR continues to use vite.config.ts unchanged.
 */
export default createViteCapacitorConfig({
  appKey: "transport",
  optimizeDepsInclude: ["sonner", "zod", "react-hook-form", "@hookform/resolvers/zod"],
  vite: {
    server: {
      port: 5175,
      strictPort: false,
    },
  },
});
