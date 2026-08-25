/** Enable CSS motion + experience tier when the user has not requested reduced motion. */

import { applyExperienceTier } from "@/experience/capability";

export function enableSiteMotion(): () => void {
  const root = document.documentElement;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

  const sync = () => {
    root.classList.toggle("site-motion", !mq.matches);
    applyExperienceTier();
  };

  const onVisibility = () => {
    root.classList.toggle("site-motion-paused", document.visibilityState === "hidden");
  };

  sync();
  onVisibility();
  mq.addEventListener("change", sync);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    mq.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
