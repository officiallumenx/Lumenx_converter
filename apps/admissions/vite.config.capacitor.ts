import { createViteCapacitorConfig } from "@lumenx/capacitor/vite";

/** Capacitor build for LumenX Admissions. Web dev uses vite.config.ts. */
export default createViteCapacitorConfig({
  appKey: "admissions",
  optimizeDepsInclude: ["sonner", "zod", "react-hook-form", "@hookform/resolvers/zod"],
  vite: {
    server: {
      port: 5177,
      strictPort: false,
    },
  },
});
