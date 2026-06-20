import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  Home,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Calendar,
  Users,
  Bell,
  MessageSquare,
  ShieldAlert,
  User as UserIcon,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Trophy,
  MoreHorizontal,
  Wallet,
  FileText,
  CalendarDays,
  HelpCircle,
  Settings,
  Info,
  Siren,
  CalendarOff,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { Role } from "@lumenx/types";
import { Button } from "@lumenx/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lumenx/ui";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { GlobalSearch } from "./GlobalSearch";
import { ParentContextBar } from "./ParentContextBar";
import { TEACHER_NAV, TEACHER_MOBILE_PRIMARY } from "@/lib/teacher/nav";
import { STUDENT_ALL_NAV, STUDENT_MOBILE_PRIMARY } from "@/lib/student/nav";
import {
  getParentNav,
  PARENT_MOBILE_PRIMARY,
  PARENT_MOBILE_PRIMARY_DELEGATED,
} from "@/lib/parent/nav";
import { studentNotificationStore } from "@/lib/student/notification-store";
import { PortalMark, PORTAL_LABEL } from "@/components/app/PortalMark";

const NAV: { to: string; label: string; icon: typeof Home; roles: Role[] }[] = [
  { to: "/", label: "Home", icon: Home, roles: ["parent", "teacher", "student"] },
  { to: "/alerts", label: "Alerts", icon: Siren, roles: ["parent", "student", "teacher"] },
  {
    to: "/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/leave", label: "Leave", icon: CalendarOff, roles: ["parent", "teacher"] },
  {
    to: "/assignments",
    label: "Assignments",
    icon: BookOpen,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/marks", label: "Marks", icon: GraduationCap, roles: ["parent", "teacher", "student"] },
  { to: "/exams", label: "Exams", icon: GraduationCap, roles: ["parent", "teacher", "student"] },
  { to: "/fees", label: "Fees", icon: Wallet, roles: ["parent", "student"] },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/timetable", label: "Timetable", icon: Calendar, roles: ["parent", "teacher", "student"] },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/events", label: "Events", icon: CalendarDays, roles: ["parent", "teacher", "student"] },
  { to: "/teachers", label: "Teachers", icon: Users, roles: ["parent", "student"] },
  { to: "/sports", label: "Sports", icon: Trophy, roles: ["parent", "teacher", "student"] },
  { to: "/growth", label: "Growth", icon: Sparkles, roles: ["parent", "student"] },
  { to: "/id-card", label: "ID Card", icon: FileText, roles: ["parent", "student"] },
  {
    to: "/complaints",
    label: "Complaints",
    icon: ShieldAlert,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/profile", label: "Settings", icon: UserIcon, roles: ["parent", "teacher", "student"] },
];

const ROLE_LABEL: Record<Role, string> = {
  parent: "Parent",
  teacher: "Teacher",
  student: "Student",
};

type NavItem = { to: string; label: string; icon: typeof Home };

function isNavActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  if (to === "/students") return pathname === "/students" || pathname.startsWith("/students/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, role, theme, toggleTheme, signOut, institute, studentIncludedMode, activeChildId, hydrated } =
    useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !role) nav({ to: "/login" });
  }, [user, role, nav, hydrated]);

  const isTeacher = role === "teacher";

  const items: NavItem[] = useMemo(() => {
    if (isTeacher) {
      return TEACHER_NAV.map((n) => ({ to: n.to, label: n.label, icon: n.icon }));
    }
    if (role === "student") {
      return STUDENT_ALL_NAV.map((n) => ({ to: n.to, label: n.label, icon: n.icon }));
    }
    if (role === "parent") {
      return getParentNav(studentIncludedMode).map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
      }));
    }
    return NAV.filter((n) => role && n.roles.includes(role));
  }, [role, studentIncludedMode, isTeacher]);

  const mobilePrimary = useMemo(() => {
    if (isTeacher) {
      return TEACHER_MOBILE_PRIMARY.map((p) => items.find((n) => n.to === p)).filter(Boolean) as NavItem[];
    }
    if (role === "student") {
      return STUDENT_MOBILE_PRIMARY.map((p) => items.find((n) => n.to === p)).filter(Boolean) as NavItem[];
    }
    if (role === "parent") {
      const order = studentIncludedMode ? PARENT_MOBILE_PRIMARY_DELEGATED : PARENT_MOBILE_PRIMARY;
      return order.map((p) => items.find((n) => n.to === p)).filter(Boolean) as NavItem[];
    }
    return items.slice(0, 4);
  }, [items, role, studentIncludedMode, isTeacher]);

  const mobileSecondary = useMemo(
    () => items.filter((n) => !mobilePrimary.find((m) => m.to === n.to)),
    [items, mobilePrimary],
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [loc.pathname]);

  const studentUnread = useSyncExternalStore(
    studentNotificationStore.subscribe,
    studentNotificationStore.getUnreadCount,
    () => 0,
  );

  if (!hydrated || !user || !role) return null;

  const navLink = (n: NavItem, compact?: "sidebar" | "rail" | "mobile") => {
    const active = isNavActive(loc.pathname, n.to);
    const base =
      compact === "rail"
        ? "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-[10px] transition-colors touch-manipulation"
        : compact === "mobile"
          ? "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[clamp(8.5px,1.6vw+7px,11px)] transition-colors select-none touch-manipulation"
          : "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors";

    const activeCls =
      compact === "mobile"
        ? active
          ? "text-primary"
          : "text-muted-foreground"
        : active
          ? "bg-primary text-primary-foreground shadow-glow"
          : compact === "rail"
            ? "text-sidebar-foreground hover:bg-sidebar-accent"
            : "text-sidebar-foreground hover:bg-sidebar-accent";

    return (
      <Link
        key={n.to}
        to={n.to}
        preload="intent"
        className={cn(base, activeCls)}
        title={n.label}
      >
        {compact === "mobile" ? (
          <>
            <div className={cn("p-1.5 rounded-lg transition-colors", active && "bg-primary/10")}>
              <n.icon className={cn("size-[1.15rem]", active && "stroke-[2.5]")} />
            </div>
            <span className="max-w-full truncate px-0.5 text-center leading-none">{n.label}</span>
          </>
        ) : compact === "rail" ? (
          <>
            <n.icon className={cn("size-5 shrink-0", active && "stroke-[2.5]")} />
            <span className="max-w-full truncate text-center leading-none">{n.label.split(" ")[0]}</span>
          </>
        ) : (
          <>
            <n.icon className="size-4 shrink-0" /> {n.label}
          </>
        )}
      </Link>
    );
  };

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background text-foreground">
      <header className="z-40 shrink-0 glass border-b border-border">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <PortalMark role={role} />
            <div className="hidden min-w-0 sm:block">
              <div className="font-display font-semibold leading-none text-sm md:text-base">
                LumenX Connect
              </div>
              <div className="truncate text-[10px] md:text-[11px] text-muted-foreground" title={institute?.name}>
                {PORTAL_LABEL[role]}
                {institute ? ` · ${institute.code}` : ""}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-2 min-w-0">
            <GlobalSearch />
            <div className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[10px] font-medium sm:inline-flex sm:text-xs">
              <span className="size-1.5 rounded-full bg-success" />
              {ROLE_LABEL[role]}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hidden sm:inline-flex"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Link to="/notifications">
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-5" />
                {role === "student" && studentUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {studentUnread > 9 ? "9+" : studentUnread}
                  </span>
                )}
                {role !== "student" && (
                  <span className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-2 gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.phone}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    <span className="size-1.5 rounded-full bg-success" /> {ROLE_LABEL[role]} portal
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>
                  <UserIcon className="size-4 mr-2" /> Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="sm:hidden">
                  {theme === "dark" ? (
                    <Sun className="size-4 mr-2" />
                  ) : (
                    <Moon className="size-4 mr-2" />
                  )}{" "}
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    nav({ to: "/login" });
                  }}
                  className="text-destructive"
                >
                  <LogOut className="size-4 mr-2" /> Sign out & switch portal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {role === "parent" && <ParentContextBar />}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {isTeacher ? (
          <>
            <aside className="hidden md:flex lg:hidden w-[4.5rem] shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden">
              <nav className="flex-1 overflow-y-auto overscroll-contain py-3 px-1.5 flex flex-col gap-1">
                {items.map((n) => navLink(n, "rail"))}
              </nav>
            </aside>
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden">
              <nav className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-0.5">
                {items.map((n) => navLink(n))}
              </nav>
              <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
                {PORTAL_LABEL[role]} · v2
              </div>
            </aside>
          </>
        ) : (
          <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden">
            <nav className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-0.5">
              {items.map((n) => navLink(n))}
            </nav>
            <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
              {PORTAL_LABEL[role]} · v2
            </div>
          </aside>
        )}

        <main className="flex-1 min-w-0 overflow-y-auto overscroll-contain pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 md:px-8 md:py-5">
            <div
              key={role === "parent" ? `${loc.pathname}:${activeChildId}` : loc.pathname}
              className="animate-in-up min-w-0"
            >
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
        <div className="mx-auto max-w-2xl flex items-stretch justify-around px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {mobilePrimary.map((n) => navLink(n, "mobile"))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[clamp(8.5px,1.6vw+7px,11px)] transition-colors select-none touch-manipulation text-muted-foreground"
              >
                <div className="p-1.5 rounded-lg">
                  <MoreHorizontal className="size-[1.15rem]" />
                </div>
                <span className="leading-none">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[80vh]">
              <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <SheetTitle className="font-display text-lg mb-4">
                  More in {ROLE_LABEL[role]}
                </SheetTitle>
                <div className="grid grid-cols-3 gap-2">
                  {mobileSecondary.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      preload="intent"
                      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors touch-manipulation active:scale-[0.97]"
                    >
                      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                        <n.icon className="size-5" />
                      </div>
                      <span className="text-[11px] font-medium text-center leading-tight">{n.label}</span>
                    </Link>
                  ))}
                </div>
                <div className="mt-6 space-y-2 border-t border-border pt-4">
                  {[
                    { icon: Settings, label: "Settings", action: () => { setMoreOpen(false); nav({ to: "/profile" }); } },
                    { icon: HelpCircle, label: "Help", action: () => { setMoreOpen(false); nav({ to: "/profile", search: { section: "support" } }); } },
                    { icon: Info, label: "About", action: () => { setMoreOpen(false); nav({ to: "/profile" }); } },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} type="button" onClick={action} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted/40 touch-manipulation">
                      <Icon className="size-4 text-primary" /> {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setLogoutConfirm(true)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 touch-manipulation mt-2"
                  >
                    <LogOut className="size-4" /> Logout
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {logoutConfirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setLogoutConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl border bg-card p-5 shadow-elevated" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold">Sign out?</h3>
            <p className="mt-1 text-sm text-muted-foreground">You will return to the login screen.</p>
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" className="rounded-xl" onClick={() => setLogoutConfirm(false)}>Cancel</Button>
              <Button variant="destructive" className="rounded-xl" onClick={() => { setLogoutConfirm(false); setMoreOpen(false); signOut(); nav({ to: "/login" }); }}>Sign out</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
