// ======= Sticky header + back-to-top
document.addEventListener("DOMContentLoaded", function () {
  const ud_header = document.querySelector(".ud-header");
  if (!ud_header) return;

  const logo = document.querySelector(".header-logo");
  const backToTop = document.querySelector(".back-to-top");
  const prefersReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Authentic mark is used for all states (PNG wordmark is correct).
  const markLogo = "/assets/logo/lumenx-mark.png";

  let ticking = false;

  function applySticky() {
    const sticky = ud_header.offsetTop || 0;
    const scrolled = window.pageYOffset > sticky;

    if (scrolled) {
      ud_header.classList.add("sticky-header");
      ud_header.classList.remove("absolute", "bg-transparent", "z-40");
    } else {
      ud_header.classList.remove("sticky-header");
      ud_header.classList.add("absolute", "bg-transparent", "z-40");
    }

    if (logo) {
      logo.src = markLogo;
    }

    if (backToTop) {
      if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        backToTop.style.display = "flex";
      } else {
        backToTop.style.display = "none";
      }
    }
  }

  window.addEventListener(
    "scroll",
    () => {
      if (prefersReduced) {
        applySticky();
        return;
      }
      if (!ticking) {
        window.requestAnimationFrame(() => {
          applySticky();
          ticking = false;
        });
        ticking = true;
      }
    },
    { passive: true }
  );

  applySticky();
});
