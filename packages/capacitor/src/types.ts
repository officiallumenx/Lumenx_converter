/** LumenX apps that can ship as Capacitor / PWA clients. */
export type LumenXMobileApp = "connect" | "admin" | "nexus" | "transport";

/**
 * Capacitor configuration shape (mirrors @capacitor/cli CapacitorConfig).
 * Defined locally so @lumenx/capacitor does not require Capacitor at install time.
 */
export interface LumenXCapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  /** WebView background color (hex, e.g. #FCFCFD) — avoids a flash during load/resume. */
  backgroundColor?: string;
  android: {
    path: string;
    /** Native window background color (hex) — matches the WebView to prevent flashes. */
    backgroundColor?: string;
  };
  server: {
    androidScheme: "https" | "http";
  };
  plugins?: {
    StatusBar?: {
      overlaysWebView?: boolean;
      style?: "DARK" | "LIGHT" | "DEFAULT";
      backgroundColor?: string;
    };
  };
}

export interface LumenXCapacitorAppOptions {
  /** Reverse-DNS id, e.g. com.lumenx.app.connect */
  appId: string;
  /** Display name on device home screen */
  appName: string;
  /** Static build output directory relative to the app workspace */
  webDir?: string;
  /** Native Android project folder relative to the app workspace */
  androidPath?: string;
  /** WebView + native window background color (hex) to avoid load/resume flashes. */
  backgroundColor?: string;
}

export interface LumenXViteCapacitorOptions {
  /** Short app key used for Vite cache names, e.g. connect */
  appKey: LumenXMobileApp;
  /** Additional Vite user config merged after mobile defaults */
  vite?: Record<string, unknown>;
  /** Additional tanstackStart options merged after mobile defaults */
  tanstackStart?: Record<string, unknown>;
  /** Extra entries for optimizeDeps.include */
  optimizeDepsInclude?: string[];
}
