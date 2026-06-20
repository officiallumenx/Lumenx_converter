import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  Briefcase,
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  MoreHorizontal,
  Users,
  Bell,
  FileText,
  User,
  Settings,
  LogIn,
  BriefcaseBusiness,
  Calendar,
  Moon,
  Sun,
  Monitor,
  Search,
} from "lucide-react";
import { useState } from "react";
import { Button, Sheet, SheetContent, SheetTitle, SheetTrigger, cn } from "@lumenx/ui";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { useCareersTheme } from "@/careers-portal/core/CareersThemeProvider";
import { isMinimalShellRoute } from "@/careers-portal/core/guards";
import { isRecruiter } from "@/lib/careers/auth-utils";
import { unreadNotificationCount } from "@/lib/careers/repositories";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  auth?: boolean;
};

const JOB_SEEKER_PRIMARY_NAV: NavItem[] = [
  { to: "/careers", label: "Home", icon: Home, exact: true },
  { to: "/careers/jobs", label: "Jobs", icon: Briefcase },
  { to: "/careers/dashboard", label: "Dashboard", icon: LayoutDashboard, auth: true },
  { to: "/careers/applications", label: "Applications", icon: FolderOpen, auth: true },
];

const JOB_SEEKER_MORE_NAV: NavItem[] = [
  { to: "/careers/apply", label: "Apply", icon: FilePlus, auth: true },
  { to: "/careers/saved", label: "Saved jobs", icon: BriefcaseBusiness, auth: true },
  { to: "/careers/interviews", label: "Interviews", icon: Calendar, auth: true },
  { to: "/careers/documents", label: "Documents", icon: FileText, auth: true },
  { to: "/careers/notifications", label: "Notifications", icon: Bell, auth: true },
  { to: "/careers/profile", label: "Profile", icon: User, auth: true },
  { to: "/careers/settings", label: "Settings", icon: Settings, auth: true },
];

const RECRUITER_PRIMARY_NAV: NavItem[] = [
  { to: "/careers/recruiter", label: "Workspace", icon: LayoutDashboard, auth: true },
  { to: "/careers/recruiter/jobs", label: "My jobs", icon: Briefcase, auth: true },
  { to: "/careers/jobs", label: "Browse market", icon: Search, exact: true },
  { to: "/careers/recruiter/applicants", label: "Applicants", icon: FolderOpen, auth: true },
];

const RECRUITER_MORE_NAV: NavItem[] = [
  { to: "/careers/recruiter/talent", label: "Discover talent", icon: Users, auth: true },
  { to: "/careers", label: "Careers home", icon: Home, exact: true },
  { to: "/careers/settings", label: "Settings", icon: Settings, auth: true },
];

function navTarget(item: NavItem, user: ReturnType<typeof useCareersAuth>["user"]) {
  if (item.auth && !user) {
    return { to: "/careers/login" as const, search: { redirect: item.to } };
  }
  return { to: item.to as "/" };
}

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to || pathname === `${to}/`;
  if (to === "/careers/jobs") {
    return pathname === to || pathname.startsWith("/careers/jobs/");
  }
  if (to === "/careers/recruiter") {
    return pathname === to || pathname === `${to}/`;
  }
  if (to.startsWith("/careers/recruiter/")) {
    return pathname === to || pathname.startsWith(`${to}/`);
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useCareersTheme();
  const cycle = () => {
    const order = ["light", "dark", "system"] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]!);
  };
  return (
    <Button variant="ghost" size="icon" onClick={cycle} aria-label="Toggle theme" className={className}>
      {theme === "dark" ? <Sun className="size-4" /> : theme === "system" ? <Monitor className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function CareersShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, signOut } = useCareersAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const minimal = isMinimalShellRoute(loc.pathname);
  const unread = user && !isRecruiter(user) ? unreadNotificationCount(user.id) : 0;
  const primaryNav = isRecruiter(user) ? RECRUITER_PRIMARY_NAV : JOB_SEEKER_PRIMARY_NAV;
  const moreNav = isRecruiter(user) ? RECRUITER_MORE_NAV : JOB_SEEKER_MORE_NAV;

  const NavLink = (item: NavItem) => {
    const { to, label, icon: Icon, exact } = item;
    const target = navTarget(item, user);
    const active = isActive(loc.pathname, to, exact);
    return (
      <Link
        to={target.to}
        search={"search" in target ? target.search : undefined}
        onClick={() => setMoreOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors min-h-10",
          active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
        {label}
      </Link>
    );
  };

  if (minimal) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-lg items-center justify-between gap-2 px-4">
            <Link to="/careers" className="flex items-center gap-2 min-w-0">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BriefcaseBusiness className="size-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Careers</p>
                <p className="text-sm font-bold leading-tight truncate">LumenX Connect</p>
              </div>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar h-screen sticky top-0">
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link to="/careers" className="flex items-center gap-2 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BriefcaseBusiness className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Careers</p>
              <p className="text-sm font-bold truncate">LumenX</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-1">
          {primaryNav.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
          <div className="my-2 border-t border-border pt-2">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">More</p>
            {moreNav.map((item) => (
              <NavLink key={item.to} {...item} />
            ))}
          </div>
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          {user ? (
            <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut(); nav({ to: "/careers/login" }); }}>
              Sign out
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button className="w-full" asChild>
                <Link to="/careers/signup" search={{ type: "job_seeker" }}><LogIn className="size-4 mr-2" /> Sign up</Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/careers/login">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <Link to="/careers" className="flex items-center gap-2 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BriefcaseBusiness className="size-3.5" />
            </div>
            <span className="truncate text-sm font-bold">Careers</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && !isRecruiter(user) && (
              <Link to="/careers/notifications" className="relative flex size-9 items-center justify-center rounded-lg border border-border">
                <Bell className="size-4" />
                {unread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            )}
            {!user && (
              <Button size="sm" variant="outline" asChild>
                <Link to="/careers/login">Sign in</Link>
              </Button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 lg:pb-8 lg:px-8 min-w-0">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden safe-area-pb">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
            {[
              primaryNav[0],
              primaryNav[1],
              user ? primaryNav[2] : { ...primaryNav[2], login: true },
              user ? primaryNav[3] : null,
            ]
              .filter(Boolean)
              .map((item) => {
                const navItem = item as NavItem & { login?: boolean };
                const target = navItem.login
                  ? { to: "/careers/login" as const, search: { redirect: navItem.to } }
                  : navTarget(navItem, user);
                const active = isActive(loc.pathname, navItem.to, navItem.exact);
                const Icon = navItem.icon;
                return (
                  <Link
                    key={navItem.to}
                    to={target.to}
                    search={"search" in target ? target.search : undefined}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] transition-colors min-w-0",
                      active ? "text-primary font-medium" : "text-muted-foreground",
                    )}
                  >
                    <Icon className={cn("size-5 shrink-0", active && "scale-110")} />
                    <span className="truncate max-w-full px-0.5">{navItem.label}</span>
                  </Link>
                );
              })}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-2 text-[10px] min-w-0",
                    moreNav.some((m) => isActive(loc.pathname, m.to)) ? "text-primary font-medium" : "text-muted-foreground",
                  )}
                >
                  <MoreHorizontal className="size-5" />
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[70vh] overflow-y-auto">
                <SheetTitle className="mb-4 text-left">More</SheetTitle>
                <div className="grid grid-cols-2 gap-2">
                  {moreNav.map((item) => {
                    const target = navTarget(item, user);
                    return (
                      <Link
                        key={item.to}
                        to={target.to}
                        search={"search" in target ? target.search : undefined}
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"
                      >
                        <item.icon className="size-4 text-primary shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                  {!user && (
                    <>
                      <Link to="/careers/login" onClick={() => setMoreOpen(false)} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                        <LogIn className="size-4" /> Sign in
                      </Link>
                      <Link to="/careers/signup" search={{ type: "job_seeker" }} onClick={() => setMoreOpen(false)} className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm">
                        <User className="size-4" /> Sign up
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}

export { JobCard, ApplicationTimeline, DocumentUploadCard, SaveJobButton } from "./CareersShellWidgets";
