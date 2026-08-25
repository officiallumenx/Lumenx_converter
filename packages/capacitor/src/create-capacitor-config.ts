import {
  LUMENX_ANDROID_PROJECT_DIR,
  LUMENX_ANDROID_SCHEME,
  LUMENX_MOBILE_WEB_DIR,
} from "./constants.ts";
import type { LumenXCapacitorAppOptions, LumenXCapacitorConfig } from "./types.ts";

/**
 * Creates a Capacitor config for a LumenX app workspace.
 * Admin and Nexus will reuse this factory with their own appId / appName.
 */
export function createCapacitorConfig(options: LumenXCapacitorAppOptions): LumenXCapacitorConfig {
  return {
    appId: options.appId,
    appName: options.appName,
    webDir: options.webDir ?? LUMENX_MOBILE_WEB_DIR,
    ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    android: {
      path: options.androidPath ?? LUMENX_ANDROID_PROJECT_DIR,
      ...(options.backgroundColor ? { backgroundColor: options.backgroundColor } : {}),
    },
    server: {
      androidScheme: LUMENX_ANDROID_SCHEME,
    },
    plugins: {
      StatusBar: {
        overlaysWebView: true,
        style: "LIGHT",
        backgroundColor: "#00000000",
      },
    },
  };
}
