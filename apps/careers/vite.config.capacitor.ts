import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/** Capacitor build for LumenX Careers (Android). Web dev uses vite.config.ts. */
export default createViteCapacitorConfig({
  appKey: "careers",
  optimizeDepsInclude: [
    "sonner",
    "zod",
    "react-hook-form",
    "@hookform/resolvers/zod",
  ],
  vite: {
    server: {
      port: 5176,
      strictPort: false,
    },
  },
});
