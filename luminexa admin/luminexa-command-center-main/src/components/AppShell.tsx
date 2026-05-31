import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, GraduationCap, CalendarRange, ClipboardCheck,
  FileText, BarChart3, MessageSquareWarning, Bell, ShieldCheck,
  HardDrive, Settings, Building2, Search, ChevronRight, Sparkles,
  Heart, CalendarDays, Siren, KeyRound, Megaphone, Sun, Moon, Menu, Layers,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";

const nav = [
  {
    label: "Intelligence",
    items: [
      { to: "/", label: "Command Center", icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/students", label: "Students", icon: Users },
      { to: "/teachers", label: "Teachers", icon: GraduationCap },
      { to: "/parents", label: "Parents", icon: Heart },
      { to: "/accounts", label: "Accounts & Access", icon: KeyRound },
    ],
  },
  {
    label: "Academics",
    items: [
      { to: "/classes", label: "Classes & Sections", icon: Building2 },
      { to: "/timetable", label: "Timetable", icon: CalendarRange },
      { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
      { to: "/exams", label: "Exams & Marks", icon: FileText },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/announcements", label: "Announcements", icon: Megaphone },
      { to: "/events", label: "Events", icon: CalendarDays },
      { to: "/alerts", label: "Alerts", icon: Siren },
      { to: "/complaints", label: "Complaints", icon: MessageSquareWarning },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/permissions", label: "Permissions", icon: ShieldCheck },
      { to: "/modules", label: "Modules & Plan", icon: Layers },
      { to: "/storage", label: "Storage", icon: HardDrive },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
] as const;

export function AppShell({ children, title, subtitle, actions }: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [openSearch, setOpenSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border">
        <div className="size-8 rounded-md bg-primary flex items-center justify-center shadow-glow">
          <Sparkles className="size-4 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-sm">LUMINEXA</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Admin OS</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {nav.map((group) => (
          <div key={group.label}>
            <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
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
                        ? "bg-gradient-to-r from-primary/12 to-primary/[0.04] text-primary font-medium shadow-[inset_0_1px_0_0_oklch(1_0_0_/_0.4)]"
                        : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-primary" />}
                    <Icon className={`size-4 shrink-0 transition-transform ${active ? "scale-110" : "group-hover:scale-105"}`} strokeWidth={active ? 2.25 : 1.75} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="size-3.5 opacity-70" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-sidebar-border">
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
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar sticky top-0 h-screen">
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
        <header className="h-16 sticky top-0 z-20 flex items-center justify-between gap-3 px-4 md:px-8 border-b border-border bg-background/85 backdrop-blur-md">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden size-9 rounded-md border border-border bg-surface flex items-center justify-center">
            <Menu className="size-4" />
          </button>
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setOpenSearch(true)}
              className="hidden sm:flex items-center gap-2 w-full px-3 h-9 rounded-md bg-surface border border-border text-xs text-muted-foreground hover:bg-surface-hover transition-colors"
            >
              <Search className="size-3.5" />
              <span className="truncate">Search students, teachers, classes…</span>
              <kbd className="ml-auto hidden sm:inline-flex font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">⌘K</kbd>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden xl:flex items-center gap-2 px-3 h-7 rounded-full bg-success/10 border border-success/20">
              <span className="size-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-mono tracking-wide text-success">SYSTEMS OPTIMAL</span>
            </div>
            <button className="hidden md:flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-surface hover:bg-surface-hover text-xs">
              <Building2 className="size-3.5" />
              <span className="font-medium">Branch · Alpha</span>
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

        <main className="flex-1 px-4 md:px-8 py-8 animate-entrance">
          <div className="max-w-[1440px] mx-auto w-full">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </main>
      </div>

      {openSearch && (
        <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-start justify-center pt-32" onClick={() => setOpenSearch(false)}>
          <div className="w-full max-w-xl mx-4 rounded-xl bg-elevated border border-border shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
              <Search className="size-4 text-muted-foreground" />
              <input autoFocus placeholder="Search the institute…" className="flex-1 bg-transparent outline-none text-sm" />
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border">ESC</kbd>
            </div>
            <div className="p-4 text-xs text-muted-foreground">Start typing to search students, teachers, complaints…</div>
          </div>
        </div>
      )}
    </div>
  );
}
