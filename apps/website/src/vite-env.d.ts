/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_ORIGIN?: string;
  readonly VITE_CONNECT_ORIGIN?: string;
  readonly VITE_TRANSPORT_ORIGIN?: string;
  readonly VITE_NEXUS_ORIGIN?: string;
  readonly VITE_ADMIN_APK_URL?: string;
  readonly VITE_CONNECT_APK_URL?: string;
  readonly VITE_TRANSPORT_APK_URL?: string;
  readonly VITE_ADMIN_PLAY_URL?: string;
  readonly VITE_CONNECT_PLAY_URL?: string;
  readonly VITE_TRANSPORT_PLAY_URL?: string;
  readonly VITE_ADMIN_APP_STORE_URL?: string;
  readonly VITE_CONNECT_APP_STORE_URL?: string;
  readonly VITE_TRANSPORT_APP_STORE_URL?: string;
  readonly VITE_ADMIN_IOS_URL?: string;
  readonly VITE_CONNECT_IOS_URL?: string;
  readonly VITE_TRANSPORT_IOS_URL?: string;
  readonly VITE_ADMIN_VERSION?: string;
  readonly VITE_CONNECT_VERSION?: string;
  readonly VITE_TRANSPORT_VERSION?: string;
  readonly VITE_NEXUS_VERSION?: string;
  readonly VITE_LEAD_ENDPOINT?: string;
  /** Absolute public origin (no trailing slash), e.g. https://www.example.com. Prefer this in production so canonical/OG URLs stay stable. */
  readonly VITE_SITE_ORIGIN?: string;
  /** Set to 1/true/yes on preview hosts so robots disallow indexing. */
  readonly VITE_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
