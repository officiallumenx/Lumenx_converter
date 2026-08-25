import {
  useCallback,
  useEffect,
  useState,
  type DependencyList,
} from "react";

type UseAsyncLoadOptions<T> = {
  /** Value before the first successful load. */
  initial: T;
  /** Defaults to `true`. */
  initialLoading?: boolean;
  /** Value applied when the loader rejects. Defaults to `initial`. */
  fallbackOnError?: T;
  /** When false, skip the load (e.g. wait for auth). Defaults to true. */
  enabled?: boolean;
};

/**
 * Cancel-safe async load with loading flag. Re-runs when `deps` change.
 */
export function useAsyncLoad<T>(
  loader: () => Promise<T>,
  deps: DependencyList,
  options: UseAsyncLoadOptions<T>,
): { data: T; loading: boolean; reload: () => void } {
  const {
    initial,
    initialLoading = true,
    fallbackOnError = initial,
    enabled = true,
  } = options;

  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(initialLoading);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void loader()
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(fallbackOnError);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // Caller owns deps; reloadToken forces an explicit refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional dep array from caller
  }, [enabled, reloadToken, ...deps]);

  return { data, loading, reload };
}
