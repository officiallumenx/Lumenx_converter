import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Home,
  GraduationCap,
  FilePlus,
  FolderOpen,
  MoreHorizontal,
  Bell,
  FileText,
  HelpCircle,
  Phone,
  User,
  Settings,
  LogIn,
  Building2,
  Moon,
  Sun,
  LayoutDashboard,
  ClipboardList,
  FormInput,
  MessageSquare,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@lumenx/ui";
import { Sheet, SheetTrigger } from "@lumenx/ui";
import { MobileMoreSheetContent } from "@/components/app/MobileMoreSheetContent";
import { cn } from "@lumenx/ui";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { LumenXLogo } from "@/components/app/LumenXLogo";
import { useAdmissionsTheme } from "@/admissions-portal/core/AdmissionsThemeProvider";
import { isMinimalShellRoute } from "@/admissions-portal/core/guards";
import { unreadNotificationCount } from "@/lib/admissions/repositories";
import type { AdmissionsUser } from "@/lib/admissions/types";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  auth?: boolean;
  parentOnly?: boolean;
  instituteOnly?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/admissions", label: "Home", icon: Home, exact: true },
  { to: "/admissions/institutes", label: "Institutes", icon: Building2 },
  { to: "/admissions/programs", label: "Programs", icon: GraduationCap },
  {
    to: "/admissions/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    auth: true,
    parentOnly: true,
  },
  { to: "/admissions/apply", label: "Apply", icon: FilePlus, auth: true, parentOnly: true },
];

const MORE_NAV: NavItem[] = [
  {
    to: "/admissions/applications",
    label: "Applications",
    icon: FolderOpen,
    auth: true,
    parentOnly: true,
  },
  { to: "/admissions/documents", label: "Documents", icon: FileText, auth: true, parentOnly: true },
  {
    to: "/admissions/interviews",
    label: "Interviews",
    icon: Calendar,
    auth: true,
    parentOnly: true,
  },
  {
    to: "/admissions/inquiries",
    label: "Inquiries",
    icon: MessageSquare,
    auth: true,
    parentOnly: true,
  },
  { to: "/admissions/notifications", label: "Notifications", icon: Bell, auth: true },
  { to: "/admissions/faq", label: "FAQs", icon: HelpCircle },
  { to: "/admissions/contact", label: "Contact", icon: Phone },
  { to: "/admissions/profile", label: "Profile", icon: User, auth: true },
  { to: "/admissions/settings", label: "Settings", icon: Settings, auth: true },
];

const INSTITUTE_ADMIN_NAV: NavItem[] = [
  { to: "/admissions/institute", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admissions/institute/applications", label: "Applications", icon: FolderOpen },
  { to: "/admissions/institute/form", label: "Form builder", icon: FormInput },
  { to: "/admissions/institute/profile", label: "Institute profile", icon: Building2 },
];

function navVisible(item: NavItem, user: AdmissionsUser | null) {
  if (user?.accountType === "institute_admin") {
    if (item.parentOnly) return false;
    return true;
  }
  if (item.instituteOnly) return false;
  if (item.parentOnly && user?.accountType === "institute_admin") return false;
  return true;
}

function navTarget(item: NavItem, user: AdmissionsUser | null) {
  if (item.auth && !user) {
    return { to: "/admissions/login" as const, search: { redirect: item.to } };
  }
  return { to: item.to as "/" };
}

function isActive(pathname: string, to: string, exact?: boolean) {
  if (exact) return pathname === to || pathname === `${to}/`;
  if (to === "/admissions/institutes") {
    return pathname === to || pathname.startsWith("/admissions/institutes/");
  }
  if (to === "/admissions/institute") {
    return pathname === to || pathname === `${to}/`;
  }
  if (to === "/admissions/institute/profile" || to === "/admissions/institute/settings") {
    return (
      pathname === "/admissions/institute/profile" || pathname === "/admissions/institute/settings"
    );
  }
  if (to.startsWith("/admissions/institute/")) {
    return pathname === to || pathname.startsWith(`${to}/`);
  }
  return pathname === to || pathname.startsWith(`${to}/`);
}

function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useAdmissionsTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className={className}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function AdmissionsShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const nav = useNavigate();
  const { user, signOut } = useAdmissionsAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const minimal = isMinimalShellRoute(loc.pathname);
  const unread = user ? unreadNotificationCount(user.id) : 0;
  const isInstituteAdmin = user?.accountType === "institute_admin";
  const mainNav = isInstituteAdmin
    ? INSTITUTE_ADMIN_NAV
    : PRIMARY_NAV.filter((item) => navVisible(item, user));

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
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
            <Link to="/admissions" className="flex items-center gap-2 min-w-0">
              <LumenXLogo size="sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Admissions
                </p>
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
          <Link to="/admissions" className="flex items-center gap-2 min-w-0">
            <LumenXLogo size="sm" />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Admissions
              </p>
              <p className="text-sm font-bold truncate">LumenX</p>
            </div>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-1">
          {mainNav.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
          {!isInstituteAdmin && (
            <div className="my-2 border-t border-border pt-2">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                More
              </p>
              {MORE_NAV.filter((item) => navVisible(item, user)).map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>
          )}
          {isInstituteAdmin && (
            <div className="my-2 border-t border-border pt-2">
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                More
              </p>
              {[
                { to: "/admissions/institutes", label: "Browse institutes", icon: Building2 },
                { to: "/admissions/profile", label: "Profile", icon: User, auth: true },
                { to: "/admissions/settings", label: "Settings", icon: Settings, auth: true },
              ].map((item) => (
                <NavLink key={item.to} {...item} />
              ))}
            </div>
          )}
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          {user ? (
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                signOut();
                nav({ to: "/admissions/login" });
              }}
            >
              Sign out
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button className="w-full" asChild>
                <Link to="/admissions/signup" search={{ type: "parent" }}>
                  <LogIn className="size-4 mr-2" /> Parent sign up
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/admissions/signup" search={{ type: "institute" }}>
                  Institute sign up
                </Link>
              </Button>
              <Button variant="ghost" className="w-full" asChild>
                <Link to="/admissions/login">Sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-md lg:hidden">
          <Link to="/admissions" className="flex items-center gap-2 min-w-0">
            <LumenXLogo size="sm" className="h-8" />
            <span className="truncate text-sm font-bold">Admissions</span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            {user && (
              <Link
                to="/admissions/notifications"
                className="relative flex size-9 items-center justify-center rounded-lg border border-border"
              >
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
                <Link to="/admissions/login">Sign in</Link>
              </Button>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 lg:pb-8 lg:px-8 min-w-0">
          {children}
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md lg:hidden safe-area-pb">
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
            {(isInstituteAdmin
              ? [
                  INSTITUTE_ADMIN_NAV[0],
                  INSTITUTE_ADMIN_NAV[1],
                  INSTITUTE_ADMIN_NAV[2],
                  INSTITUTE_ADMIN_NAV[3],
                ]
              : [
                  PRIMARY_NAV[0],
                  PRIMARY_NAV[1],
                  PRIMARY_NAV[2],
                  user ? PRIMARY_NAV[3] : { ...PRIMARY_NAV[4], login: true },
                ]
            )
              .filter(Boolean)
              .map((item) => {
                const navItem = item as NavItem & { login?: boolean };
                const target = navItem.login
                  ? { to: "/admissions/login" as const, search: { redirect: navItem.to } }
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
                    MORE_NAV.some((m) => isActive(loc.pathname, m.to))
                      ? "text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                >
                  <MoreHorizontal className="size-5" />
                  More
                </button>
              </SheetTrigger>
              <MobileMoreSheetContent title="More">
                <div className="grid grid-cols-2 gap-2">
                  {MORE_NAV.filter((item) => navVisible(item, user)).map((item) => {
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
                      <Link
                        to="/admissions/login"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"
                      >
                        <LogIn className="size-4" /> Sign in
                      </Link>
                      <Link
                        to="/admissions/signup"
                        onClick={() => setMoreOpen(false)}
                        className="flex items-center gap-2 rounded-xl border border-border p-3 text-sm"
                      >
                        <User className="size-4" /> Sign up
                      </Link>
                    </>
                  )}
                </div>
              </MobileMoreSheetContent>
            </Sheet>
          </div>
        </nav>
      </div>
    </div>
  );
}

export {
  ProgramCard,
  ApplicationStatusTimeline,
  DocumentUploadCard,
} from "./AdmissionsShellWidgets";
