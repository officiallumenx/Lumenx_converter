import { useSyncExternalStore } from "react";

type StoreListener = () => void;

export type ClientDataStore<T> = {
  load: () => T;
  query: <R>(selector: (snapshot: T) => R) => R;
  set: (next: T) => T;
  mutate: (updater: (snapshot: T) => T) => T;
  subscribe: (listener: StoreListener) => () => void;
  useSnapshot: () => T;
};

type LocalStoreOptions<T> = {
  storageKey: string | (() => string);
  eventName: string;
  externalEvents?: readonly string[];
  seed: () => T;
  parse?: (raw: string) => T;
  serialize?: (value: T) => string;
  normalize?: (value: T) => T;
};

export function createLocalStorageStore<T>(options: LocalStoreOptions<T>): ClientDataStore<T> {
  const parse = options.parse ?? ((raw: string) => JSON.parse(raw) as T);
  const serialize = options.serialize ?? ((value: T) => JSON.stringify(value));
  const normalize = options.normalize ?? ((value: T) => value);
  const listeners = new Set<StoreListener>();

  let cachedRaw: string | null = null;
  let cachedSnapshot: T | null = null;

  const key = () =>
    typeof options.storageKey === "function" ? options.storageKey() : options.storageKey;

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const write = (next: T): T => {
    const normalized = normalize(next);
    cachedSnapshot = normalized;
    try {
      const raw = serialize(normalized);
      cachedRaw = raw;
      localStorage.setItem(key(), raw);
    } catch {
      // Keep in-memory state available even when storage is unavailable.
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(options.eventName));
    }
    notify();
    return normalized;
  };

  const read = (): T => {
    const raw = localStorage.getItem(key());
    // Same reference when nothing changed — required by useSyncExternalStore.
    // Empty storage keeps cachedRaw = null; do not re-seed a new object each read.
    if (cachedSnapshot !== null && raw === cachedRaw) {
      return cachedSnapshot;
    }
    try {
      if (!raw) {
        const seeded = normalize(options.seed());
        cachedSnapshot = seeded;
        cachedRaw = null;
        return seeded;
      }
      const parsed = normalize(parse(raw));
      cachedSnapshot = parsed;
      cachedRaw = raw;
      return parsed;
    } catch {
      const seeded = normalize(options.seed());
      cachedSnapshot = seeded;
      cachedRaw = null;
      return seeded;
    }
  };

  const subscribe = (listener: StoreListener) => {
    listeners.add(listener);
    const onExternal = () => {
      cachedRaw = null;
      cachedSnapshot = null;
      listener();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onExternal);
      window.addEventListener("focus", onExternal);
      // Same-tab writes already call notify(). Do not also listen to eventName —
      // that cleared the cache and returned a new snapshot (render loop risk).
      for (const eventName of options.externalEvents ?? []) {
        window.addEventListener(eventName, onExternal);
      }
    }
    return () => {
      listeners.delete(listener);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onExternal);
        window.removeEventListener("focus", onExternal);
        for (const eventName of options.externalEvents ?? []) {
          window.removeEventListener(eventName, onExternal);
        }
      }
    };
  };

  const load = () => read();

  return {
    load,
    query: (selector) => selector(load()),
    set: (next) => write(next),
    mutate: (updater) => write(updater(load())),
    subscribe,
    useSnapshot: () => useSyncExternalStore(subscribe, load, options.seed),
  };
}
