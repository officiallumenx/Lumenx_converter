/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEXUS_AUTH_MODE?: string;
  /** When true (default), operator must sign in at /login. */
  readonly VITE_NEXUS_REQUIRE_LOGIN?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
