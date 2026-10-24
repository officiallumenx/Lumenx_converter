import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { PRIMARY_NAV, type NavItem } from "@/content/nav";
import { cn } from "@lumenx/ui";

function pathMatches(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function menuIsActive(item: Extract<NavItem, { kind: "menu" }>, pathname: string): boolean {
  if (item.overview && pathMatches(pathname, item.overview.to)) return true;
  return item.children.some((child) => pathMatches(pathname, child.to));
}

function NavDropdown({
  item,
  onNavigate,
}: {
  item: Extract<NavItem, { kind: "menu" }>;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const panelId = useId();
  const keyboardOpen = useRef(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = menuIsActive(item, pathname);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !keyboardOpen.current) return;
    keyboardOpen.current = false;
    wrapRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
  }, [open]);

  function menuItems(): HTMLElement[] {
    return Array.from(wrapRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
  }

  function onButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) {
        wrapRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus();
        return;
      }
      keyboardOpen.current = true;
      setOpen(true);
    }
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = menuItems();
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length === 0) return;
      const next =
        event.key === "ArrowDown"
          ? items[(index + 1 + items.length) % items.length]
          : items[(index - 1 + items.length) % items.length];
      next?.focus();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      wrapRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    }
  }

  return (
    <div
      className="site-nav-dropdown"
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        id={buttonId}
        className={cn("site-nav-link site-nav-trigger", (open || active) && "active")}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        {item.label}
        <ChevronDown className={cn("size-3.5 opacity-70 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <div
          id={panelId}
          role="menu"
          aria-labelledby={buttonId}
          className="site-nav-panel"
          onKeyDown={onPanelKeyDown}
        >
          {item.overview ? (
            <Link
              to={item.overview.to}
              role="menuitem"
              className="site-nav-panel__overview"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              <span className="font-semibold text-foreground">{item.overview.title}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{item.overview.description}</span>
            </Link>
          ) : null}
          <ul className="site-nav-panel__list">
            {item.children.map((child) => (
              <li key={`${child.to}-${child.label}`}>
                <Link
                  to={child.to}
                  search={child.search}
                  role="menuitem"
                  className="site-nav-panel__item"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="font-medium text-foreground">{child.label}</span>
                  {child.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{child.description}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          {item.footerLink ? (
            <Link
              to={item.footerLink.to}
              role="menuitem"
              className="site-nav-panel__footer"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
            >
              {item.footerLink.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Navbar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Primary">
      {PRIMARY_NAV.map((item) => {
        if (item.kind === "link") {
          const active = pathMatches(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn("site-nav-link", active && "active")}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          );
        }
        return <NavDropdown key={item.id} item={item} onNavigate={onNavigate} />;
      })}
    </nav>
  );
}
