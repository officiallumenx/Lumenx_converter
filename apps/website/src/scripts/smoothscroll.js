/**
 * Smooth in-page anchor scrolling with sticky-header offset.
 * Preserves native hash / back-forward. Respects prefers-reduced-motion.
 */

const HEADER_OFFSET = 88;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getHeaderOffset() {
  const header =
    document.querySelector(".ud-header") ||
    document.querySelector("header");
  if (!header) return HEADER_OFFSET;
  return Math.max(header.getBoundingClientRect().height, 64) + 12;
}

function scrollToHash(hash, { replace = false } = {}) {
  if (!hash || hash === "#") return false;
  let target;
  try {
    target = document.querySelector(hash);
  } catch {
    return false;
  }
  if (!target) return false;

  const top =
    window.scrollY + target.getBoundingClientRect().top - getHeaderOffset();

  window.scrollTo({
    top: Math.max(0, top),
    behavior: prefersReducedMotion() ? "auto" : "smooth",
  });

  if (replace) {
    history.replaceState(null, "", hash);
  }

  return true;
}

function onClick(event) {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;
  if (link.hasAttribute("download") || link.getAttribute("target") === "_blank") {
    return;
  }

  const href = link.getAttribute("href");
  if (!href || href === "#") return;

  const url = new URL(href, window.location.href);
  if (url.pathname !== window.location.pathname) return;

  if (scrollToHash(url.hash)) {
    event.preventDefault();
    history.pushState(null, "", url.hash);
  }
}

function onLoad() {
  if (window.location.hash) {
    // Defer so layout/sticky header heights settle
    requestAnimationFrame(() => {
      scrollToHash(window.location.hash, { replace: true });
    });
  }
}

document.addEventListener("click", onClick);
window.addEventListener("popstate", () => {
  if (window.location.hash) {
    scrollToHash(window.location.hash);
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onLoad);
} else {
  onLoad();
}
