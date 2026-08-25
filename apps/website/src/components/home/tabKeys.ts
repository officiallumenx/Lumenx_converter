import { useCallback, useRef, type KeyboardEvent } from "react";

export function cycleTabKey<T extends string>(
  event: KeyboardEvent,
  ids: readonly T[],
  active: T,
  setActive: (id: T) => void,
  focus?: (id: T) => void,
) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
    return;
  }
  event.preventDefault();
  const i = ids.indexOf(active);
  let next: T;
  if (event.key === "Home") next = ids[0];
  else if (event.key === "End") next = ids[ids.length - 1];
  else {
    const dir = event.key === "ArrowRight" ? 1 : -1;
    next = ids[(i + dir + ids.length) % ids.length];
  }
  setActive(next);
  focus?.(next);
}

export function useTabFocus<T extends string>() {
  const nodes = useRef(new Map<T, HTMLButtonElement>());
  const setRef = useCallback(
    (id: T) => (el: HTMLButtonElement | null) => {
      if (el) nodes.current.set(id, el);
      else nodes.current.delete(id);
    },
    [],
  );
  const focus = useCallback((id: T) => {
    nodes.current.get(id)?.focus();
  }, []);
  return { setRef, focus };
}
