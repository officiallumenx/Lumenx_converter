import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/**
 * Capacitor + future PWA build for LumenX Connect.
 * Web dev/SSR/deploy continues to use vite.config.ts unchanged.
 */
export default createViteCapacitorConfig({
  appKey: "connect",
  optimizeDepsInclude: [
    "sonner",
    "zod",
    "react-hook-form",
    "@hookform/resolvers/zod",
  ],
  vite: {
    server: {
      port: 5174,
      strictPort: false,
    },
  },
});
