/** Default static output folder — shared by Capacitor webDir and future PWA deploys. */
export const LUMENX_MOBILE_WEB_DIR = "dist" as const;

/** Capacitor Android WebView scheme — https is required for secure browser APIs. */
export const LUMENX_ANDROID_SCHEME = "https" as const;

/** Relative path to the generated Android Gradle project inside each app workspace. */
export const LUMENX_ANDROID_PROJECT_DIR = "android" as const;

/** npm package id pattern for LumenX native shells. */
export const LUMENX_APP_ID_PATTERN = "com.lumenx.app.{app}" as const;
