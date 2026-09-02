/** Demo Admin ↔ Connect sync: localStorage (same origin) + postMessage (opened portal). */

export const LUMENX_DEMO_SYNC = "lumenx-demo-sync";
export const LUMENX_DEMO_SYNC_PING_KEY = "lumenx.demo.sync-ping.v1";

export type DemoSyncKind =
  | "leave"
  | "marks"
  | "broadcast"
  | "announcements"
  | "complaints"
  | "careers"
  | "emergency";

export function postDemoSync(kind: DemoSyncKind, payload?: unknown): void {
  if (typeof window === "undefined") return;
  const message = { type: LUMENX_DEMO_SYNC, kind, payload, at: Date.now() };
  try {
    window.opener?.postMessage(message, "*");
  } catch {
    /* ignore */
  }
  try {
    window.parent?.postMessage(message, "*");
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(LUMENX_DEMO_SYNC_PING_KEY, JSON.stringify(message));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(LUMENX_DEMO_SYNC, { detail: message }));
  } catch {
    /* ignore */
  }
}

export function listenDemoSync(
  kind: DemoSyncKind,
  onSync: (payload: unknown) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onMessage = (event: MessageEvent) => {
    if (event.data?.type !== LUMENX_DEMO_SYNC || event.data?.kind !== kind) return;
    onSync(event.data.payload);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LUMENX_DEMO_SYNC_PING_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as { kind?: string; payload?: unknown };
      if (parsed.kind === kind) onSync(parsed.payload);
    } catch {
      /* ignore */
    }
  };
  const onCustom = (event: Event) => {
    const detail = (event as CustomEvent).detail as { kind?: string; payload?: unknown };
    if (detail?.kind === kind) onSync(detail.payload);
  };
  window.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);
  window.addEventListener(LUMENX_DEMO_SYNC, onCustom);
  return () => {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(LUMENX_DEMO_SYNC, onCustom);
  };
}
