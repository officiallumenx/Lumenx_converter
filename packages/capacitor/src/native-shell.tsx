import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

function canNavigateBack(): boolean {
  const state = window.history.state as { idx?: number } | null;
  if (typeof state?.idx === "number") {
    return state.idx > 0;
  }
  return window.history.length > 1;
}

/** Radix-based overlays that should be closed by the hardware back button before navigating. */
const OPEN_OVERLAY_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[role="menu"][data-state="open"]',
  '[role="listbox"][data-state="open"]',
  "[data-radix-popper-content-wrapper]",
].join(",");

function hasOpenOverlay(): boolean {
  return document.querySelector(OPEN_OVERLAY_SELECTOR) !== null;
}

/** Close the topmost dismissable overlay by emulating an Escape keypress (Radix listens for it). */
function dismissTopOverlay(): void {
  const target: Element = document.activeElement ?? document.body;
  const init: KeyboardEventInit = {
    key: "Escape",
    code: "Escape",
    bubbles: true,
    cancelable: true,
  };
  target.dispatchEvent(new KeyboardEvent("keydown", init));
  target.dispatchEvent(new KeyboardEvent("keyup", init));
}

function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "OPTION") {
    return true;
  }
  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'),
  );
}

/** Measure safe-area env vars; Android WebView often reports 0 until edge-to-edge + fallback. */
function applySafeAreaInsets() {
  const root = document.documentElement;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);visibility:hidden;pointer-events:none;";
  document.body.appendChild(probe);
  const styles = getComputedStyle(probe);
  const top = parseFloat(styles.paddingTop) || 0;
  const bottom = parseFloat(styles.paddingBottom) || 0;
  probe.remove();

  root.style.setProperty("--safe-area-inset-top-measured", `${top}px`);
  root.style.setProperty("--safe-area-inset-bottom-measured", `${bottom}px`);

  if (Capacitor.getPlatform() === "android" && top < 8) {
    root.style.setProperty("--safe-area-top-fallback", "28px");
  } else {
    root.style.setProperty("--safe-area-top-fallback", "0px");
  }
}

/**
 * Invisible native shell wiring for Capacitor Android/iOS.
 * Renders nothing — only registers platform listeners when running inside a native WebView.
 *
 * Admin and Nexus mount this component the same way inside their root route.
 */
export function LumenXNativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const blockNativeTextSelection = (event: Event) => {
      if (isTextEntryTarget(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("selectstart", blockNativeTextSelection);
    document.addEventListener("contextmenu", blockNativeTextSelection);

    applySafeAreaInsets();
    window.addEventListener("resize", applySafeAreaInsets);
    window.visualViewport?.addEventListener("resize", applySafeAreaInsets);

    let backListener: { remove: () => Promise<void> } | undefined;
    let resumeListener: { remove: () => Promise<void> } | undefined;
    let disposed = false;

    // Re-measure safe areas when returning from the background; the WebView does not
    // reliably fire a resize on resume, so insets/fallbacks can otherwise go stale.
    void App.addListener("resume", () => {
      applySafeAreaInsets();
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      resumeListener = handle;
    });

    void App.addListener("backButton", () => {
      if (hasOpenOverlay()) {
        dismissTopOverlay();
        return;
      }
      if (canNavigateBack()) {
        router.history.back();
        return;
      }
      void App.exitApp();
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
        return;
      }
      backListener = handle;
    });

    return () => {
      disposed = true;
      document.removeEventListener("selectstart", blockNativeTextSelection);
      document.removeEventListener("contextmenu", blockNativeTextSelection);
      window.removeEventListener("resize", applySafeAreaInsets);
      window.visualViewport?.removeEventListener("resize", applySafeAreaInsets);
      void backListener?.remove();
      void resumeListener?.remove();
    };
  }, [router]);

  return null;
}
