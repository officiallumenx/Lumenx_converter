function initProductGalleries() {
  document.querySelectorAll("[data-product-gallery]").forEach((root) => {
    const tabs = Array.from(root.querySelectorAll("[data-gallery-tab]"));
    const panels = Array.from(root.querySelectorAll("[data-gallery-panel]"));
    if (!tabs.length || !panels.length) return;

    function activate(index, { focus = false } = {}) {
      tabs.forEach((tab, i) => {
        const selected = i === index;
        tab.setAttribute("aria-selected", selected ? "true" : "false");
        tab.tabIndex = selected ? 0 : -1;
        tab.classList.toggle("bg-primary", selected);
        tab.classList.toggle("text-white", selected);
        tab.classList.toggle("bg-gray-1", !selected);
        tab.classList.toggle("text-dark", !selected);
        tab.classList.toggle("dark:bg-dark-2", !selected);
        tab.classList.toggle("dark:text-white", !selected);
        if (selected && focus) tab.focus();
      });

      panels.forEach((panel, i) => {
        panel.hidden = i !== index;
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        activate(Number(tab.getAttribute("data-index") || 0));
      });

      tab.addEventListener("keydown", (event) => {
        const current = Number(tab.getAttribute("data-index") || 0);
        let next = current;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          next = (current + 1) % tabs.length;
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          next = (current - 1 + tabs.length) % tabs.length;
        } else if (event.key === "Home") {
          next = 0;
        } else if (event.key === "End") {
          next = tabs.length - 1;
        } else {
          return;
        }
        event.preventDefault();
        activate(next, { focus: true });
      });
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProductGalleries);
} else {
  initProductGalleries();
}
