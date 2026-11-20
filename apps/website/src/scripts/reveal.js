/**
 * LumenX scroll-reveal via IntersectionObserver.
 * Targets legacy Play `.wow.fadeInUp` and `[data-reveal]`.
 * Content stays visible if JS fails — pending state is applied only off-screen.
 */

const prefersReduced =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function assignStaggerIndices(root = document) {
  root.querySelectorAll("[data-stagger]").forEach((group) => {
    const items = group.querySelectorAll(".wow.fadeInUp, [data-reveal]");
    items.forEach((el, i) => {
      el.style.setProperty("--reveal-i", String(i));
    });
  });

  root.querySelectorAll(".lx-eco-strip").forEach((strip) => {
    [...strip.children].forEach((child, i) => {
      const link = child.querySelector("a") || child;
      link.style.setProperty("--eco-i", String(i));
    });
  });
}

function isInViewport(el) {
  const rect = el.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.top < vh * 0.92 && rect.bottom > 0;
}

function reveal(el) {
  el.classList.remove("is-pending");
  el.classList.add("is-revealed");
}

function initReveals() {
  const nodes = [
    ...document.querySelectorAll(".wow.fadeInUp, [data-reveal]"),
  ];

  assignStaggerIndices();

  if (!nodes.length) return;

  if (prefersReduced || !("IntersectionObserver" in window)) {
    nodes.forEach(reveal);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -6% 0px",
      threshold: 0.1,
    }
  );

  nodes.forEach((el) => {
    const delayAttr = el.getAttribute("data-wow-delay");
    if (delayAttr && !el.closest("[data-stagger]")) {
      el.style.transitionDelay = delayAttr;
    }

    if (isInViewport(el)) {
      reveal(el);
      return;
    }

    el.classList.add("is-pending");
    observer.observe(el);
  });
}

function initHero() {
  const stage = document.querySelector(".hero-stage");
  if (!stage) return;

  if (prefersReduced) {
    stage.classList.add("is-ready");
    return;
  }

  stage.classList.add("is-animating");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      stage.classList.add("is-ready");
    });
  });
}

function initPage() {
  if (!prefersReduced) {
    document.body.classList.add("lx-page-ready");
  }
  initHero();
  initReveals();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPage);
} else {
  initPage();
}
