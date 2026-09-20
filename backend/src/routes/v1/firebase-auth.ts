/**
 * Firebase public client hints only (Analytics / Crashlytics).
 * Auth ID-token bridge (whoami / resolve / session / link) was removed in Phase 4.
 * FCM uses Admin Messaging via integrations/firebase — not these routes.
 */

import { Hono } from "hono";
import type { AppBindings } from "../../types/app.js";
import { loadEnv } from "../../config/env.js";
import { getFirebasePublicClientHints } from "../../integrations/firebase.js";

const firebasePublic = new Hono<AppBindings>();

/** Public — non-secret Firebase client hints only (no private key / client email). */
firebasePublic.get("/public-config", (c) => {
  const env = loadEnv();
  return c.json({ data: getFirebasePublicClientHints(env) });
});

export default firebasePublic;
