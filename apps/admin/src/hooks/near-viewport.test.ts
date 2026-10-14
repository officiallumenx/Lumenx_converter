import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createOnceIntersectObserver,
  personPhotoFetchEnabled,
} from "./near-viewport";

describe("personPhotoFetchEnabled", () => {
  it("does not fetch without a photo asset path", () => {
    expect(
      personPhotoFetchEnabled({ photoAssetPath: null, nearViewport: true }),
    ).toBe(false);
    expect(
      personPhotoFetchEnabled({ photoAssetPath: "  ", nearViewport: true }),
    ).toBe(false);
    expect(
      personPhotoFetchEnabled({ photoAssetPath: undefined, nearViewport: true }),
    ).toBe(false);
  });

  it("does not fetch when off-screen even if a path exists", () => {
    expect(
      personPhotoFetchEnabled({
        photoAssetPath: "institutes/x/teachers/y.jpg",
        nearViewport: false,
      }),
    ).toBe(false);
  });

  it("allows fetch when near viewport and a path exists", () => {
    expect(
      personPhotoFetchEnabled({
        photoAssetPath: "institutes/x/teachers/y.jpg",
        nearViewport: true,
      }),
    ).toBe(true);
  });
});

describe("createOnceIntersectObserver", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    expect(createOnceIntersectObserver(() => {})).toBeNull();
  });

  it("observes, fires once on intersect, and disconnects", () => {
    const disconnect = vi.fn();
    const observe = vi.fn();
    const callbackRef: { current: IntersectionObserverCallback | null } = { current: null };

    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
        callbackRef.current = cb;
        return { observe, disconnect, unobserve: vi.fn() };
      }),
    );

    const onIntersect = vi.fn();
    const observer = createOnceIntersectObserver(onIntersect);
    expect(observer).not.toBeNull();

    const el = { tagName: "DIV" } as unknown as Element;
    observer!.observe(el);
    expect(observe).toHaveBeenCalledWith(el);

    callbackRef.current?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      observer as IntersectionObserver,
    );
    expect(onIntersect).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not fire when entries are not intersecting", () => {
    const callbackRef: { current: IntersectionObserverCallback | null } = { current: null };
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      vi.fn().mockImplementation((cb: IntersectionObserverCallback) => {
        callbackRef.current = cb;
        return { observe: vi.fn(), disconnect, unobserve: vi.fn() };
      }),
    );

    const onIntersect = vi.fn();
    const observer = createOnceIntersectObserver(onIntersect);
    callbackRef.current?.(
      [{ isIntersecting: false } as IntersectionObserverEntry],
      observer as IntersectionObserver,
    );
    expect(onIntersect).not.toHaveBeenCalled();
    expect(disconnect).not.toHaveBeenCalled();
  });
});
