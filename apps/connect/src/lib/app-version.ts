import manifest from "../../app-version.json";

/** User-visible semver — keep in sync via apps/connect/app-version.json */
export const CONNECT_APP_VERSION = manifest.version;

/** Android versionCode — increments on each store/test APK upload */
export const CONNECT_APP_BUILD = manifest.androidVersionCode;

/** Shown in Settings → Support & help */
export const CONNECT_APP_VERSION_LABEL = `${manifest.version} (build ${manifest.androidVersionCode})`;
