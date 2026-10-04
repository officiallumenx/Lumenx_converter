import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

type UseActivityCachedLoadOptions<T> = {
  /** Stable key for the resource (e.g. sportId). Reloads when it changes. */
  key: string;
  load: () => Promise<T>;
  initial: T;
};

const cache = new Map<string, unknown>();

/**
 * Activity hierarchy / list loader that keeps prior data visible on refresh
 * and remount (module cache), showing a skeleton only on a cold first load.
 */
export function useActivityCachedLoad<T>({
  key,
  load,
  initial,
}: UseActivityCachedLoadOptions<T>): {
  data: T;
  loading: boolean;
  refresh: () => void;
  setData: Dispatch<SetStateAction<T>>;
} {
  const [data, setDataState] = useState<T>(() =>
    cache.has(key) ? (cache.get(key) as T) : initial,
  );
  const [loading, setLoading] = useState(() => !cache.has(key));
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;
  const keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    let cancelled = false;
    const hasCached = cache.has(key);
    if (hasCached) {
      setDataState(cache.get(key) as T);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void loadRef
      .current()
      .then((value) => {
        if (cancelled) return;
        cache.set(key, value);
        setDataState(value);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        cache.set(key, initial);
        setDataState(initial);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- key/tick drive reloads
  }, [key, tick]);

  const refresh = useCallback(() => {
    setTick((n) => n + 1);
  }, []);

  const setData = useCallback<Dispatch<SetStateAction<T>>>((action) => {
    setDataState((prev) => {
      const next =
        typeof action === "function" ? (action as (p: T) => T)(prev) : action;
      cache.set(keyRef.current, next);
      return next;
    });
  }, []);

  return { data, loading, refresh, setData };
}
