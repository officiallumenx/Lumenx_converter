/**
 * Crash reporting — Capacitor Crashlytics when native; web non-fatal client otherwise.
 * Never attach emails, phones, tokens, or LumenX business payloads.
 *
 * Native: install `@capacitor-firebase/crashlytics` in Capacitor apps (Admin/Connect/Transport/Careers).
 * Web: no Firebase Crashlytics SDK — scrubbed console / global handlers only.
 */

import type { FirebaseWebConfigSource } from "./config";
import { resolveFirebaseWebConfig } from "./config";
import { scrubCrashMessage } from "./privacy";

export type LumenXCrashAppId =
  | "admin"
  | "nexus"
  | "connect"
  | "transport"
  | "admissions"
  | "careers";

type CrashlyticsPlugin = {
  crash: (options?: { message?: string }) => Promise<void>;
  setEnabled: (options: { enabled: boolean }) => Promise<void>;
  setUserId?: (options: { userId: string }) => Promise<void>;
  log?: (options: { message: string }) => Promise<void>;
  recordException?: (options: { message: string }) => Promise<void>;
};

async function loadNativeCrashlytics(): Promise<CrashlyticsPlugin | null> {
  if (typeof window === "undefined") return null;
  const cap = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  try {
    const mod = await import(
      /* @vite-ignore */ "@capacitor-firebase/crashlytics"
    ).catch(() => null);
    const plugin = (mod as { FirebaseCrashlytics?: CrashlyticsPlugin } | null)
      ?.FirebaseCrashlytics;
    return plugin ?? null;
  } catch {
    return null;
  }
}

function readCrashlyticsEnabledFlag(): boolean {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  const raw = env?.VITE_FIREBASE_CRASHLYTICS_ENABLED?.trim().toLowerCase();
  if (raw === "false" || raw === "0") return false;
  if (raw === "true" || raw === "1") return true;
  // Default: enable when Firebase web config exists (native builds ship Crashlytics).
  return Boolean(resolveFirebaseWebConfig());
}

function readReleaseId(): string | undefined {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  return env?.VITE_APP_RELEASE?.trim() || undefined;
}

/**
 * Record a non-fatal error. Uses native Crashlytics when available; otherwise
 * logs a scrubbed console error (web error client).
 */
export async function recordNonFatalError(input: {
  error: unknown;
  appId: LumenXCrashAppId;
  context?: string;
  source?: FirebaseWebConfigSource;
}): Promise<void> {
  if (!readCrashlyticsEnabledFlag()) return;

  const err = input.error instanceof Error ? input.error : new Error(String(input.error));
  const message = scrubCrashMessage(
    `[${input.appId}]${input.context ? ` ${input.context}:` : ""} ${err.name}: ${err.message}`,
  );

  const native = await loadNativeCrashlytics();
  if (native?.recordException) {
    await native.recordException({ message }).catch(() => undefined);
    return;
  }
  if (native?.log) {
    await native.log({ message }).catch(() => undefined);
  }

  // Web error client — no Firebase Crashlytics web SDK; keep local/observability-safe.
  if (typeof console !== "undefined") {
    console.error("[lumenx-crashlytics]", message);
  }
}

/** Bootstrap global handlers + native Crashlytics enablement. */
export async function bootstrapFirebaseCrashReporting(input: {
  appId: LumenXCrashAppId;
  source?: FirebaseWebConfigSource;
  enabled?: boolean;
  release?: string;
}): Promise<() => void> {
  if (typeof window === "undefined") return () => undefined;
  const enabled = input.enabled ?? readCrashlyticsEnabledFlag();
  if (!enabled) return () => undefined;

  const release = input.release ?? readReleaseId();
  const native = await loadNativeCrashlytics();
  if (native?.setEnabled) {
    await native.setEnabled({ enabled: true }).catch(() => undefined);
  }
  if (native?.log) {
    const releaseLine = scrubCrashMessage(
      `release=${release ?? "unknown"} app=${input.appId}`,
    );
    await native.log({ message: releaseLine }).catch(() => undefined);
  } else if (typeof console !== "undefined" && release) {
    console.info("[lumenx-crashlytics]", `release=${release} app=${input.appId}`);
  }

  const onError = (event: ErrorEvent) => {
    void recordNonFatalError({
      error: event.error ?? event.message,
      appId: input.appId,
      context: "window.onerror",
      source: input.source,
    });
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void recordNonFatalError({
      error: event.reason,
      appId: input.appId,
      context: "unhandledrejection",
      source: input.source,
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
