/**
 * Push permission is requested in context (Notifications / Alerts), not at cold start.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let allowed = false;

export function isAdminPushBootstrapAllowed(): boolean {
  return allowed;
}

export function enableAdminPushBootstrap(): void {
  if (allowed) return;
  allowed = true;
  listeners.forEach((l) => l());
}

export function subscribeAdminPushBootstrap(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
