import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { PRIMARY_NAV, type NavItem } from "@/content/nav";
import { cn } from "@lumenx/ui";

function pathMatches(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

function MobileMenuSection({
  item,
  onNavigate,
}: {
  item: Extract<NavItem, { kind: "menu" }>;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const defaultOpen =
    (item.overview ? pathMatches(pathname, item.overview.to) : false) ||
    item.children.some((child) => pathMatches(pathname, child.to));
  const [open, setOpen] = useState(defaultOpen);

  return (
    <li>
      <button
        type="button"
        className="site-nav-link flex w-full items-center justify-between"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <ChevronDown className={cn("size-4 opacity-70 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul className="mb-2 ml-3 border-l border-border pl-3">
          {item.overview ? (
            <li>
              <Link to={item.overview.to} className="site-nav-link w-full text-sm" onClick={onNavigate}>
                {item.overview.title}
              </Link>
            </li>
          ) : null}
          {item.children.map((child) => (
            <li key={child.to}>
              <Link to={child.to} className="site-nav-link w-full text-sm" onClick={onNavigate}>
                {child.label}
              </Link>
            </li>
          ))}
          {item.footerLink ? (
            <li>
              <Link to={item.footerLink.to} className="site-nav-link w-full text-sm" onClick={onNavigate}>
                {item.footerLink.label}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function MobileNavbar({
  open,
  onNavigate,
}: {
  open: boolean;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (!open) return null;

  return (
    <div
      id="mobile-nav"
      className="site-mobile-nav lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
    >
      <nav aria-label="Primary">
        <ul className="site-container flex flex-col py-2">
          {PRIMARY_NAV.map((item) => {
            if (item.kind === "link") {
              const active = pathMatches(pathname, item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn("site-nav-link w-full", active && "active")}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            }
            return <MobileMenuSection key={item.id} item={item} onNavigate={onNavigate} />;
          })}
          <li>
            <Link to="/login" className="site-nav-link w-full" onClick={onNavigate}>
              Login
            </Link>
          </li>
          <li>
            <Link
              to="/contact"
              search={{ intent: "demo" }}
              className="site-nav-link w-full font-semibold text-[var(--site-brand)]"
              onClick={onNavigate}
            >
              Book a Demo
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
