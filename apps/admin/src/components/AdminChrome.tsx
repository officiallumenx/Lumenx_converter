import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Building2, Search, ChevronRight, Sparkles, Bell, Sun, Moon, Menu,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/theme-provider";
import { adminNav } from "@/lib/admin-nav";

export function AdminChrome() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const isTransitioning = useRouterState({ select: (s) => s.isTransitioning });
  const navBusy = isLoading || isTransitioning;

  const [openSearch, setOpenSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearch(true);
      }
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isNavTarget = (to: string) => {
    if (!navBusy) return false;
    return to === "/" ? path === "/" : path.startsWith(to);
  };

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border shrink-0">
        <div className="size-8 rounded-md bg-primary flex items-center justify-center shadow-glow">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-sm">LUMENX ADMIN</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin OS</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto lx-sidebar-scroll px-3 py-4 space-y-5" aria-label="Main navigation">
        {adminNav.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                const pending = isNavTarget(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 min-h-10 text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      active
                        ? "bg-gradient-to-r from-primary/12 to-primary/[0.04] text-primary font-medium shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    } ${pending ? "lx-nav-item--pending" : ""}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
                    )}
                    <Icon
                      className={`size-4 shrink-0 transition-transform duration-200 ${active ? "scale-110" : "group-hover:scale-105"}`}
                      strokeWidth={active ? 2.25 : 1.75}
                    />
                    <span className="flex-1">{item.label}</span>
                    {pending && <span className="size-1.5 rounded-full bg-primary lx-nav-pulse" aria-hidden />}
                    {active && !pending && <ChevronRight className="size-3.5 opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-3 px-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-primary to-chart-5 ring-2 ring-sidebar-border flex items-center justify-center text-[11px] font-semibold text-primary-foreground">
            AV
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">Dr. Alistair Vance</div>
            <div className="text-[10px] text-muted-foreground truncate">Principal · Root Admin</div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="lx-skip-link">Skip to content</a>

      <aside className="lx-admin-sidebar hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)}>
          <aside
            className="lx-admin-sidebar w-[min(18rem,88vw)] h-full flex flex-col border-r border-sidebar-border animate-entrance shadow-pop"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="lx-admin-header relative h-14 sm:h-16 shrink-0 z-20 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 border-b backdrop-blur-md">
          <div className={`lx-nav-progress ${navBusy ? "lx-nav-progress--active" : ""}`} aria-hidden />
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden size-9 min-w-9 rounded-md border border-border bg-surface flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Menu className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Open search"
              onClick={() => setOpenSearch(true)}
              className="sm:hidden size-9 min-w-9 rounded-md border border-border bg-surface flex items-center justify-center"
            >
              <Search className="size-4 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setOpenSearch(true)}
              className="hidden sm:flex items-center gap-2 flex-1 max-w-md px-3 h-9 rounded-md bg-surface border border-border text-xs text-muted-foreground hover:bg-surface-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Search className="size-3.5 shrink-0" />
              <span className="truncate">Search students, teachers, classes…</span>
              <kbd className="ml-auto hidden md:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">Ctrl K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button type="button" className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Building2 className="size-3.5" />
              <span className="font-medium">Branch · Alpha</span>
            </button>
            <button type="button" onClick={toggle} aria-label="Toggle theme" className="size-9 min-w-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button type="button" aria-label="Notifications" className="relative size-9 min-w-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Bell className="size-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" aria-hidden />
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className="relative flex-1 overflow-y-auto overscroll-contain px-3 sm:px-6 md:px-8 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:pt-8 lg:pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <Outlet />
        </main>
      </div>

      {openSearch && typeof document !== "undefined" && createPortal(
        <div className="lx-modal-overlay lx-modal-backdrop sm:p-6" onClick={() => setOpenSearch(false)}>
          <div className="lx-modal-dialog lx-modal-dialog--md lx-modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Search">
            <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
              <Search className="size-4 text-muted-foreground" />
              <input autoFocus placeholder="Search the institute…" className="flex-1 bg-transparent outline-none text-sm min-h-9" aria-label="Search query" />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border hidden sm:inline">ESC</kbd>
            </div>
            <div className="p-4 text-xs text-muted-foreground">Start typing to search students, teachers, complaints…</div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
