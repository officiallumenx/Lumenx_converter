/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** `demo` (default) | `api` — never mix mock tokens with the live API. */
  readonly VITE_ADMIN_AUTH_MODE?: string;
  /** Optional Connect portal origin for deep links. */
  readonly VITE_CONNECT_ORIGIN?: string;
  /** Optional Connect public base URL (student portal links). */
  readonly VITE_CONNECT_PUBLIC_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
