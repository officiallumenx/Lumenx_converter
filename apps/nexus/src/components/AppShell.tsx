import { Link, useRouterState } from "@tanstack/react-router";
import {
  Search, ChevronRight, Hexagon,
  Building2, Sun, Moon, Menu, Bell,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { nexusNav, NEXUS_SEARCH_PLACEHOLDER } from "@/lib/nexus-nav";
import { NexusGlobalSearch } from "@/components/NexusGlobalSearch";
import {
  getActiveNexusOperator,
  subscribePlatformAccess,
} from "@/lib/platform-access-store";
import { loadLicenses, ensureLicensesCoverDirectory } from "@/lib/institute-licensing-store";

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [openSearch, setOpenSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [operatorTick, setOperatorTick] = useState(0);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    return subscribePlatformAccess(() => setOperatorTick((n) => n + 1));
  }, []);

  // One-time hydrate: licensing SoT + directory projection (no live subscriptions here).
  useEffect(() => {
    loadLicenses();
    ensureLicensesCoverDirectory();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearch(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  void operatorTick;
  const operator = getActiveNexusOperator();
  const operatorInitials = (operator?.displayName ?? "PO")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "PO";

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border">
        <div className="size-8 rounded-md nexus-logo-ring flex items-center justify-center">
          <Hexagon className="size-4 text-primary-foreground" strokeWidth={2.25} />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-sm text-sidebar-foreground">LUMENX NEXUS</div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-sidebar-foreground/55 font-mono">Platform Command</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {nexusNav.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45 font-mono">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 ${
                      active
                        ? "nexus-nav-active text-sidebar-primary font-medium"
                        : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <Icon className={`size-4 shrink-0 transition-transform ${active ? "scale-110 text-sidebar-primary" : "group-hover:scale-105"}`} strokeWidth={active ? 2.25 : 1.75} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="size-3.5 opacity-70 text-sidebar-primary" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-[oklch(0.58_0.13_195)] to-[oklch(0.62_0.18_285)] ring-2 ring-sidebar-border flex items-center justify-center text-[11px] font-semibold text-primary-foreground font-mono">
            {operatorInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate text-sidebar-foreground">
              {operator?.displayName ?? "Platform Owner"}
            </div>
            <div className="text-[10px] text-sidebar-foreground/50 truncate font-mono">
              {operator?.handle ?? "nexus_root"} · LumenX
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground nexus-sidebar-glow sticky top-0 h-screen">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <aside className="w-72 h-full flex flex-col bg-sidebar border-r border-sidebar-border animate-entrance" onClick={(e) => e.stopPropagation()}>
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-8 nexus-header-bar">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden size-9 rounded-md border border-border bg-surface flex items-center justify-center">
            <Menu className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              type="button"
              onClick={() => setOpenSearch(true)}
              className="hidden sm:flex items-center gap-2 w-full px-3 h-9 rounded-md bg-surface border border-border text-xs text-muted-foreground hover:bg-surface-hover transition-colors font-mono"
            >
              <Search className="size-3.5" />
              <span className="truncate">{NEXUS_SEARCH_PLACEHOLDER}</span>
              <kbd className="ml-auto hidden sm:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">⌘K</kbd>
            </button>
            <button
              type="button"
              onClick={() => setOpenSearch(true)}
              className="sm:hidden size-9 rounded-md border border-border bg-surface flex items-center justify-center"
              aria-label="Open platform search"
            >
              <Search className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2 px-3 h-7 rounded-full nexus-status-pill">
              <span className="size-1.5 rounded-full bg-primary pulse-cyan" />
              <span className="text-[10px] font-mono tracking-wide uppercase">Platform live</span>
            </div>
            <button className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-xs font-mono">
              <Building2 className="size-3.5 text-primary" />
              <span className="font-medium">42 institutes</span>
            </button>
            <button onClick={toggle} aria-label="Toggle theme" className="size-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button className="relative size-9 rounded-md border border-border bg-surface hover:bg-surface-hover flex items-center justify-center">
              <Bell className="size-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 size-1.5 rounded-full bg-destructive" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 animate-entrance">
          <div className="max-w-[1440px] mx-auto w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-4 mb-6 md:mb-8">
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-primary">Nexus</p>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>

      <NexusGlobalSearch open={openSearch} onOpenChange={setOpenSearch} />
    </div>
  );
}
