/**
 * Accessible FAQ accordion (progressive enhancement).
 */

function initFaq() {
  const items = document.querySelectorAll(".lx-faq-item");
  if (!items.length) return;

  document.documentElement.classList.add("faq-js");

  items.forEach((item) => {
    const trigger = item.querySelector(".lx-faq-trigger");
    const panel = item.querySelector(".lx-faq-panel");
    if (!trigger || !panel) return;

    const panelId = panel.id;
    trigger.setAttribute("aria-controls", panelId);
    trigger.setAttribute("aria-expanded", item.getAttribute("data-open") === "true" ? "true" : "false");

    trigger.addEventListener("click", () => {
      const open = item.getAttribute("data-open") === "true";
      const next = !open;
      item.setAttribute("data-open", next ? "true" : "false");
      trigger.setAttribute("aria-expanded", next ? "true" : "false");
    });

    trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        trigger.click();
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFaq);
} else {
  initFaq();
}
