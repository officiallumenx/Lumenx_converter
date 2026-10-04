/**
 * Push permission is requested after the authenticated Admin chrome is ready
 * (see AdminChrome), not on cold start / welcome / login.
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
