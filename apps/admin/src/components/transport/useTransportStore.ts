import {
  loadTransportSnapshot,
  saveTransportSnapshot,
  type TransportSnapshot,
  useTransportSnapshot,
} from "@/lib/transport-store";

export function useTransportStore() {
  const snapshot = useTransportSnapshot();

  const commit = (next: TransportSnapshot) => {
    saveTransportSnapshot(next);
  };

  const refresh = () => {
    loadTransportSnapshot();
  };

  return { snapshot, setSnapshot: commit, refresh };
}
