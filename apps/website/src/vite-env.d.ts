/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_ORIGIN?: string;
  readonly VITE_CONNECT_ORIGIN?: string;
  readonly VITE_TRANSPORT_ORIGIN?: string;
  readonly VITE_NEXUS_ORIGIN?: string;
  readonly VITE_CAREERS_ORIGIN?: string;
  readonly VITE_ADMISSIONS_ORIGIN?: string;
  readonly VITE_ADMIN_APK_URL?: string;
  readonly VITE_CONNECT_APK_URL?: string;
  readonly VITE_TRANSPORT_APK_URL?: string;
  readonly VITE_ADMISSIONS_APK_URL?: string;
  readonly VITE_CAREERS_APK_URL?: string;
  readonly VITE_NEXUS_APK_URL?: string;
  readonly VITE_ADMIN_DESKTOP_URL?: string;
  readonly VITE_NEXUS_DESKTOP_URL?: string;
  readonly VITE_ADMIN_PLAY_URL?: string;
  readonly VITE_CONNECT_PLAY_URL?: string;
  readonly VITE_TRANSPORT_PLAY_URL?: string;
  readonly VITE_ADMISSIONS_PLAY_URL?: string;
  readonly VITE_CAREERS_PLAY_URL?: string;
  readonly VITE_NEXUS_PLAY_URL?: string;
  readonly VITE_ADMIN_VERSION?: string;
  readonly VITE_CONNECT_VERSION?: string;
  readonly VITE_TRANSPORT_VERSION?: string;
  readonly VITE_NEXUS_VERSION?: string;
  readonly VITE_LEAD_ENDPOINT?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
