export type MessageThread = { id: string; who: string; last: string; time: string };

type Listener = () => void;

let sent: MessageThread[] = [];
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

/**
 * Lightweight store for messages sent from the parent/student portals. The demo has no
 * backend, so instead of the "Send" button being purely phantom, sent messages are recorded
 * here and surfaced at the top of the recent-threads list.
 */
export const sentMessagesStore = {
  getAll: (): MessageThread[] => sent,
  add: (who: string, text: string) => {
    sent = [
      {
        id: `msg-${Date.now()}`,
        who,
        last: text,
        time: "Just now",
      },
      ...sent,
    ];
    notify();
  },
  reset: () => {
    sent = [];
    notify();
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
