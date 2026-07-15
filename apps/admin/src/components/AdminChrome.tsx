import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Building2, Search, ChevronRight, Sparkles, Bell, Sun, Moon, Menu,
  Settings, LogOut, User, ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { adminNav } from "@/lib/admin-nav";
import { DemoProfileSwitcher } from "@/components/DemoProfileSwitcher";
import { IconChip } from "@/components/IconChip";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { useSignOut } from "@/auth/hooks/useSignOut";

export function AdminChrome() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const isTransitioning = useRouterState({ select: (s) => s.isTransitioning });
  const navBusy = isLoading || isTransitioning;
  const { profile } = useDemoProfile();
  const primaryBranch = profile.admin.branches[0];
  const signOut = useSignOut();

  const [openSearch, setOpenSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    signOut();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenSearch(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isNavTarget = (to: string) => {
    if (!navBusy) return false;
    return to === "/" ? path === "/" : path.startsWith(to);
  };

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border shrink-0">
        <span className="lx-icon-chip lx-icon-chip--sm shadow-glow" aria-hidden>
          <Sparkles strokeWidth={2} />
        </span>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-sm">LUMENX ADMIN</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate max-w-[11rem]">
            {profile.admin.headerSubtitle}
          </div>
        </div>
      </div>
      <nav
        className="flex-1 overflow-y-auto lx-sidebar-scroll px-3 py-4 space-y-5"
        aria-label="Main navigation"
      >
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
                        ? "bg-gradient-to-r from-primary/12 to-primary/[0.04] text-foreground font-medium shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    } ${pending ? "lx-nav-item--pending" : ""}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" />
                    )}
                    <IconChip
                      icon={Icon}
                      size="sm"
                      variant={active ? "brand" : "soft"}
                      active={active}
                    />
                    <span className="flex-1">{item.label}</span>
                    {pending && (
                      <span className="size-1.5 rounded-full bg-primary lx-nav-pulse" aria-hidden />
                    )}
                    {active && !pending && <ChevronRight className="size-3.5 opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {/* User profile area with popup menu */}
      <div ref={profileRef} className="px-3 py-3 border-t border-sidebar-border shrink-0 relative">
        {/* Profile popup */}
        {profileOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 rounded-xl border border-border bg-popover text-popover-foreground shadow-pop z-50 overflow-hidden animate-fade-in">
            {/* User info header */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center text-[11px] font-semibold text-primary-foreground shrink-0">
                  {profile.admin.principalName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{profile.admin.principalName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{profile.admin.principalTitle}</div>
                  <div className="text-[10px] text-primary truncate mt-0.5">admin@lumenx.edu</div>
                </div>
              </div>
            </div>
            {/* Menu items */}
            <div className="p-1.5 space-y-0.5">
              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
              >
                <User className="size-3.5 text-muted-foreground" />
                <span>Profile &amp; Settings</span>
              </Link>
              <Link
                to="/settings"
                search={{ tab: "appearance" } as never}
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors w-full"
              >
                <Sun className="size-3.5 text-muted-foreground" />
                <span>Appearance</span>
              </Link>
            </div>
            <div className="p-1.5 border-t border-border">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors w-full"
              >
                <LogOut className="size-3.5" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setProfileOpen((v) => !v)}
          className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors hover:bg-sidebar-accent ${profileOpen ? "bg-sidebar-accent" : ""}`}
        >
          <div className="size-8 rounded-full bg-gradient-to-br from-primary to-chart-5 ring-2 ring-sidebar-border flex items-center justify-center text-[10px] font-semibold text-primary-foreground shrink-0">
            {profile.admin.principalName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-medium truncate">{profile.admin.principalName}</div>
            <div className="text-[10px] text-muted-foreground truncate">{profile.admin.principalTitle}</div>
          </div>
          <ChevronDown className={`size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="lx-skip-link">
        Skip to content
      </a>

      <aside className="lx-admin-sidebar hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border h-full max-h-[100dvh]">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm animate-fade-in"
          onClick={() => setMobileOpen(false)}
        >
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

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <header className="lx-admin-header sticky top-0 z-20 shrink-0 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 border-b backdrop-blur-md">
          <div
            className={`lx-nav-progress ${navBusy ? "lx-nav-progress--active" : ""}`}
            aria-hidden
          />
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
              <kbd className="ml-auto hidden md:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">
                Ctrl K
              </kbd>
            </button>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DemoProfileSwitcher />
            {profile.admin.showBranchSwitcher && primaryBranch && (
              <button
                type="button"
                className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Building2 className="size-3.5" />
                <span className="font-medium">
                  {profile.admin.branchSwitcherLabel} · {primaryBranch.name.replace(/^(Branch|College) /, "")}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="size-9 min-w-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              aria-label="Notifications"
              className="relative size-9 min-w-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Bell className="size-4 text-muted-foreground" />
              <span
                className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive"
                aria-hidden
              />
            </button>
          </div>
        </header>

        <main
          id="main-content"
          className="relative flex-1 overflow-y-auto overscroll-contain scroll-smooth px-3 sm:px-6 md:px-8 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-[max(1.75rem,env(safe-area-inset-bottom))] lg:pt-8 lg:pb-[max(2rem,env(safe-area-inset-bottom))]"
        >
          <Outlet />
        </main>
      </div>

      <AdminGlobalSearch open={openSearch} onOpenChange={setOpenSearch} />
    </div>
  );
}
