import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Button, cn } from "@lumenx/ui";
import { PRIMARY_NAV, type NavItem } from "@/content/nav";

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
        className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-accent"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {item.label}
        <ChevronDown className={cn("size-4 opacity-70 transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul className="mb-2 ml-3 border-l border-border pl-2">
          {item.overview ? (
            <li>
              <Link
                to={item.overview.to}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={onNavigate}
              >
                {item.overview.title}
              </Link>
            </li>
          ) : null}
          {item.children.map((child) => (
            <li key={`${child.to}-${child.label}`}>
              <Link
                to={child.to}
                search={child.search}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={onNavigate}
              >
                {child.label}
              </Link>
            </li>
          ))}
          {item.footerLink ? (
            <li>
              <Link
                to={item.footerLink.to}
                className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={onNavigate}
              >
                {item.footerLink.label}
              </Link>
            </li>
          ) : null}
        </ul>
      ) : null}
    </li>
  );
}

export function MobileNavbar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav id="mobile-nav" aria-label="Primary" className="flex h-full flex-col">
      <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
        {PRIMARY_NAV.map((item) => {
          if (item.kind === "link") {
            const active = pathMatches(pathname, item.to);
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={cn(
                    "block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-accent",
                    active ? "bg-accent text-foreground" : "text-foreground",
                  )}
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
      </ul>
      <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
        <Button asChild variant="outline" className="w-full justify-center">
          <Link to="/login" onClick={onNavigate}>
            Login
          </Link>
        </Button>
        <Button asChild className="w-full justify-center font-semibold">
          <Link to="/contact" search={{ intent: "demo" }} onClick={onNavigate}>
            Book a Demo
          </Link>
        </Button>
      </div>
    </nav>
  );
}
