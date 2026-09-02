/** Demo Admin → Connect sync for institute announcement notifications. */
import { listenDemoSync } from "@lumenx/utils";

type Listener = () => void;

let epoch = 0;
const listeners = new Set<Listener>();

function notify() {
  epoch += 1;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  listenDemoSync("announcements", () => notify());
}

export function subscribeAnnouncementInboxSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function announcementInboxEpoch(): string {
  return String(epoch);
}
