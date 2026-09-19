/**
 * Firebase Analytics — product telemetry only.
 * Never send emails, phones, names, student IDs, or other LumenX business PII.
 */

import { getAnalytics, isSupported, logEvent, type Analytics } from "firebase/analytics";
import { getFirebaseApp } from "./client";
import {
  resolveFirebaseWebConfig,
  type FirebaseWebConfigSource,
} from "./config";
import { sanitizeAnalyticsParams } from "./privacy";

export type LumenXAnalyticsAppId =
  | "admin"
  | "nexus"
  | "connect"
  | "transport"
  | "admissions"
  | "careers";

/** Allowlisted event names — keep short and non-sensitive. */
export const LUMENX_ANALYTICS_EVENTS = [
  "app_open",
  "auth_login_success",
  "auth_login_failure",
  "auth_logout",
  "auth_signup_started",
  "auth_otp_requested",
  "auth_otp_verified",
  "push_permission_granted",
  "push_permission_denied",
  "push_token_registered",
  "screen_view",
  "feature_used",
] as const;

export type LumenXAnalyticsEvent = (typeof LUMENX_ANALYTICS_EVENTS)[number];

const ALLOWED = new Set<string>(LUMENX_ANALYTICS_EVENTS);

let analyticsSingleton: Analytics | null | undefined;
let analyticsAppContext: LumenXAnalyticsAppId | null = null;

/** Set current LumenX surface so auth/push helpers can emit events without PII. */
export function setLumenXAnalyticsAppContext(appId: LumenXAnalyticsAppId | null): void {
  analyticsAppContext = appId;
}

export function getLumenXAnalyticsAppContext(): LumenXAnalyticsAppId | null {
  return analyticsAppContext;
}

export async function getFirebaseAnalytics(
  source?: FirebaseWebConfigSource,
): Promise<Analytics | null> {
  if (analyticsSingleton !== undefined) return analyticsSingleton;
  if (typeof window === "undefined") {
    analyticsSingleton = null;
    return null;
  }
  const config = resolveFirebaseWebConfig(source);
  if (!config?.measurementId) {
    analyticsSingleton = null;
    return null;
  }
  const app = getFirebaseApp(source);
  if (!app) {
    analyticsSingleton = null;
    return null;
  }
  try {
    if (!(await isSupported())) {
      analyticsSingleton = null;
      return null;
    }
    analyticsSingleton = getAnalytics(app);
    return analyticsSingleton;
  } catch {
    analyticsSingleton = null;
    return null;
  }
}

export function resetFirebaseAnalyticsForTests(): void {
  analyticsSingleton = undefined;
  analyticsAppContext = null;
}

/**
 * Log an allowlisted Analytics event. No-ops when Analytics is unavailable.
 */
export async function logLumenXAnalyticsEvent(input: {
  name: LumenXAnalyticsEvent | string;
  appId: LumenXAnalyticsAppId;
  params?: Record<string, string | number | boolean>;
  source?: FirebaseWebConfigSource;
}): Promise<boolean> {
  if (!ALLOWED.has(input.name)) return false;
  const analytics = await getFirebaseAnalytics(input.source);
  if (!analytics) return false;
  const params = {
    lumenx_app: input.appId,
    ...sanitizeAnalyticsParams(input.params),
  };
  logEvent(analytics, input.name, params);
  return true;
}

/** Emit an allowlisted event for the current app context (no-op if unset / unavailable). */
export async function logLumenXAnalyticsEventForContext(input: {
  name: LumenXAnalyticsEvent;
  params?: Record<string, string | number | boolean>;
  source?: FirebaseWebConfigSource;
}): Promise<boolean> {
  const appId = analyticsAppContext;
  if (!appId) return false;
  return logLumenXAnalyticsEvent({
    name: input.name,
    appId,
    params: input.params,
    source: input.source,
  });
}

/** Identify the LumenX app surface for Analytics (no user PII). */
export async function identifyLumenXAnalyticsApp(
  appId: LumenXAnalyticsAppId,
  source?: FirebaseWebConfigSource,
): Promise<void> {
  setLumenXAnalyticsAppContext(appId);
  await logLumenXAnalyticsEvent({
    name: "app_open",
    appId,
    params: { surface: appId },
    source,
  });
}

/** Bootstrap Analytics once per session when measurementId is configured. */
export async function bootstrapFirebaseAnalytics(input: {
  appId: LumenXAnalyticsAppId;
  source?: FirebaseWebConfigSource;
  enabled?: boolean;
}): Promise<() => void> {
  if (input.enabled === false) return () => undefined;
  setLumenXAnalyticsAppContext(input.appId);
  await identifyLumenXAnalyticsApp(input.appId, input.source);
  return () => {
    setLumenXAnalyticsAppContext(null);
  };
}
