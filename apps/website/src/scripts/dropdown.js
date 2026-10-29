// ===== responsive navbar
const navbarToggler = document.querySelector("#navbarToggler");
const navbarCollapse = document.querySelector("#navbarCollapse");

if (navbarToggler && navbarCollapse) {
  navbarToggler.setAttribute("aria-expanded", "false");
  navbarToggler.setAttribute("aria-controls", "navbarCollapse");

  const closeMobileNav = () => {
    navbarToggler.classList.remove("navbarTogglerActive");
    navbarCollapse.classList.add("hidden");
    navbarToggler.setAttribute("aria-expanded", "false");
  };

  const openMobileNav = () => {
    navbarToggler.classList.add("navbarTogglerActive");
    navbarCollapse.classList.remove("hidden");
    navbarToggler.setAttribute("aria-expanded", "true");
  };

  navbarToggler.addEventListener("click", () => {
    const isOpen = !navbarCollapse.classList.contains("hidden");
    if (isOpen) closeMobileNav();
    else openMobileNav();
  });

  document.querySelectorAll("#navbarCollapse ul li:not(.submenu-item) a").forEach((e) =>
    e.addEventListener("click", () => {
      closeMobileNav();
    })
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileNav();
      document.querySelectorAll(".submenu-item .submenu").forEach((sub) => {
        if (!sub.classList.contains("lg:block")) {
          sub.classList.add("hidden");
        }
      });
      // On mobile, force-hide toggled submenus
      document.querySelectorAll(".submenu-item .submenu.hidden").forEach(() => {});
      document.querySelectorAll(".submenu-item .submenu:not(.hidden)").forEach((sub) => {
        if (window.matchMedia("(max-width: 959px)").matches) {
          sub.classList.add("hidden");
        }
      });
    }
  });
}

// ===== Sub-menu (mobile toggle; desktop uses hover/focus-within CSS)
const submenuItems = document.querySelectorAll(".submenu-item");
submenuItems.forEach((el) => {
  const trigger = el.querySelector(":scope > a");
  const submenu = el.querySelector(".submenu");
  if (!trigger || !submenu) return;

  trigger.setAttribute("aria-haspopup", "true");

  trigger.addEventListener("click", (event) => {
    // Desktop: allow navigation to parent Solutions path; mobile: toggle panel
    if (window.matchMedia("(max-width: 959px)").matches) {
      event.preventDefault();
      submenu.classList.toggle("hidden");
      const expanded = !submenu.classList.contains("hidden");
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    }
  });
});
