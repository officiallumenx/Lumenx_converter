import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { getInitials } from "@lumenx/utils";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type CSSProperties,
} from "react";
import { AppLockScreen } from "@/components/app/AppLockScreen";
import { RouteOutletErrorBoundary } from "@/components/app/RouteOutletErrorBoundary";
import { appLockStore } from "@/lib/app-lock-store";
import { useIsConnectSettingsRoute } from "@/lib/connect-settings-route";
import { readMainScroll, saveMainScroll } from "@/lib/main-scroll-memory";
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
  Siren,
  CalendarOff,
  MessageSquarePlus,
  Flag,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import { useKeyboardViewport } from "@/lib/use-keyboard-viewport-offset";
import type { Role } from "@lumenx/types";
import {
  Button,
  Switch,
  useIsMobile,
  useSwipeNavigation,
  toSwipeNavItems,
  ModuleTransitionRoot,
  navigateWithModuleTransition,
  getModuleNavDirection,
} from "@lumenx/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lumenx/ui";
import { Avatar, AvatarFallback } from "@lumenx/ui";
import { Sheet, SheetTrigger } from "@lumenx/ui";
import { PendingSyncBadge } from "@lumenx/ui";
import { MobileMoreSheetContent } from "@/components/app/MobileMoreSheetContent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { GlobalSearch } from "./GlobalSearch";
import { ParentContextBar } from "./ParentContextBar";
import { ActivityWorkspaceContextBar } from "./ActivityWorkspaceContextBar";
import { isConnectSettingsPath } from "@/lib/connect-settings-route";
import {
  TEACHER_MOBILE_PRIMARY,
  TEACHER_MOBILE_SHORT_LABELS,
  getTeacherNavItems,
} from "@/lib/teacher/nav";
import {
  ACTIVITY_MOBILE_PRIMARY,
  ACTIVITY_MOBILE_SHORT_LABELS,
  ACTIVITY_WORKSPACE_BASE,
  getActivityNavItems,
  isActivityWorkspacePath,
} from "@/activity-workspace";
import { useTeacherPortalAccess } from "@/lib/teacher-session";
import { teacherSessionStore } from "@/lib/teacher-session/teacher-session-store";
import {
  isActivityWorkspaceActive,
  isSubjectWorkspaceActive,
} from "@lumenx/teacher-session";
import {
  STUDENT_ALL_NAV,
  STUDENT_MOBILE_PRIMARY,
  STUDENT_MOBILE_SHORT_LABELS,
  studentMobileNavIconStyle,
  studentMoreTileStyle,
  type StudentModuleColor,
} from "@/lib/student/nav";
import {
  getParentNav,
  PARENT_MOBILE_PRIMARY,
  PARENT_MOBILE_PRIMARY_DELEGATED,
  PARENT_MOBILE_SHORT_LABELS,
} from "@/lib/parent/nav";
import { PORTAL_LABEL, PortalMark } from "@/components/app/PortalMark";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { formatUnreadBadgeCount, useConnectUnreadBadge } from "@/lib/use-connect-unread-badge";
import { useConnectAlertBadge } from "@/lib/use-connect-alert-badge";

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
  { to: "/activities", label: "Activities", icon: Trophy, roles: ["parent", "student"] },
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

type NavItem = {
  to: string;
  label: string;
  icon: typeof Home;
  moduleColor?: StudentModuleColor;
};

function isNavActive(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  if (to === ACTIVITY_WORKSPACE_BASE) {
    return pathname === ACTIVITY_WORKSPACE_BASE || pathname === `${ACTIVITY_WORKSPACE_BASE}/`;
  }
  if (to === "/students") return pathname === "/students" || pathname.startsWith("/students/");
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, role, theme, toggleTheme, signOut, institute, studentIncludedMode, activeChildId, hydrated } =
    useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const prevPathRef = useRef(loc.pathname);
  const ignoreScrollSaveRef = useRef(false);
  const scrollTopUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openLogoutConfirm = () => {
    setMoreOpen(false);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => setLogoutConfirm(true), 240);
  };

  useEffect(() => {
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      if (scrollTopUnlockTimerRef.current) clearTimeout(scrollTopUnlockTimerRef.current);
    };
  }, []);

  const scrollMainToTop = () => {
    // Ignore intermediate smooth-scroll events so memory stays at 0.
    ignoreScrollSaveRef.current = true;
    saveMainScroll(loc.pathname, 0);
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    if (scrollTopUnlockTimerRef.current) clearTimeout(scrollTopUnlockTimerRef.current);
    scrollTopUnlockTimerRef.current = setTimeout(() => {
      ignoreScrollSaveRef.current = false;
      saveMainScroll(loc.pathname, 0);
      scrollTopUnlockTimerRef.current = null;
    }, 450);
  };

  // Keep scroll memory updated while the user scrolls the custom <main> container.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    const onScroll = () => {
      if (ignoreScrollSaveRef.current) return;
      saveMainScroll(loc.pathname, el.scrollTop);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [loc.pathname]);

  useEffect(() => {
    if (!hydrated) return;
    if ((!user || !role) && loc.pathname !== "/login") {
      void nav({ to: "/login" });
    }
  }, [user, role, nav, hydrated, loc.pathname]);

  const isTeacher = role === "teacher";
  const teacherPortal = useTeacherPortal();
  const portalAccess = useTeacherPortalAccess();
  const onActivityPath = isActivityWorkspacePath(loc.pathname);
  const useActivityNav =
    isTeacher &&
    (portalAccess.isReady
      ? portalAccess.isActivityWorkspaceActive
      : onActivityPath);

  useEffect(() => {
    if (!hydrated || !isTeacher || !portalAccess.isReady) return;
    const session = teacherSessionStore.get();
    if (!session) return;

    const activityActive = isActivityWorkspaceActive(session);
    const subjectActive = isSubjectWorkspaceActive(session);
    const path = loc.pathname;
    const onActivity = isActivityWorkspacePath(path);
    const onSettings = isConnectSettingsPath(path);

    if (activityActive && !onActivity && !onSettings) {
      // Subject /notifications must land on Activity inbox — not Activity home.
      if (path === "/notifications" || path.startsWith("/notifications/")) {
        nav({ to: `${ACTIVITY_WORKSPACE_BASE}/notifications` });
        return;
      }
      nav({ to: ACTIVITY_WORKSPACE_BASE });
      return;
    }
    if (subjectActive && onActivity && !onSettings) {
      nav({ to: "/" });
    }
  }, [
    hydrated,
    isTeacher,
    loc.pathname,
    portalAccess.isReady,
    nav,
  ]);

  const teacherHasTransport =
    teacherPortal.isTeacher && teacherPortal.profile?.hasTransport === true;
  const portalSubtitle = useActivityNav
    ? "Activity"
    : role
      ? PORTAL_LABEL[role]
      : "";

  const items: NavItem[] = useMemo(() => {
    if (isTeacher && useActivityNav) {
      return getActivityNavItems().map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
        moduleColor: n.moduleColor,
      }));
    }
    if (isTeacher) {
      return getTeacherNavItems(teacherHasTransport).map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
        moduleColor: n.moduleColor,
      }));
    }
    if (role === "student") {
      return STUDENT_ALL_NAV.map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
        moduleColor: n.moduleColor,
      }));
    }
    if (role === "parent") {
      return getParentNav(studentIncludedMode).map((n) => ({
        to: n.to,
        label: n.label,
        icon: n.icon,
        moduleColor: n.moduleColor,
      }));
    }
    return NAV.filter((n) => role && n.roles.includes(role));
  }, [role, studentIncludedMode, isTeacher, teacherHasTransport, useActivityNav]);

  const mobilePrimary = useMemo(() => {
    if (isTeacher && useActivityNav) {
      return ACTIVITY_MOBILE_PRIMARY.map((p) => items.find((n) => n.to === p)).filter(
        Boolean,
      ) as NavItem[];
    }
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
  }, [items, role, studentIncludedMode, isTeacher, useActivityNav]);

  const mobileSecondary = useMemo(
    () => items.filter((n) => !mobilePrimary.find((m) => m.to === n.to)),
    [items, mobilePrimary],
  );

  const moreMenuHasActive = useMemo(
    () => mobileSecondary.some((n) => isNavActive(loc.pathname, n.to)),
    [mobileSecondary, loc.pathname],
  );

  const swipePrimaryPaths = useMemo(
    () => toSwipeNavItems(mobilePrimary.map((n) => n.to)),
    [mobilePrimary],
  );
  const swipeMorePaths = useMemo(
    () => toSwipeNavItems(mobileSecondary.map((n) => n.to)),
    [mobileSecondary],
  );
  const isMobileSwipe = useIsMobile();
  const { open: keyboardOpen } = useKeyboardViewport();
  const settingsPath = items.find((n) => n.label === "Settings")?.to;

  useSwipeNavigation({
    containerRef: mainRef,
    pathname: loc.pathname,
    primaryPaths: swipePrimaryPaths,
    morePaths: swipeMorePaths,
    enabled: isMobileSwipe && !logoutConfirm,
    isActive: isNavActive,
    settingsPath,
    homePath: swipePrimaryPaths[0]?.path,
    onNavigate: (to) => {
      setMoreOpen(false);
      const direction = getModuleNavDirection(loc.pathname, to, swipePrimaryPaths, swipeMorePaths, {
        isActive: isNavActive,
        settingsPath,
      });
      navigateWithModuleTransition(() => {
        void nav({ to });
      }, direction);
    },
  });

  const handleMoreNavClick = (to: string, e: React.MouseEvent) => {
    setMoreOpen(false);
    if (isNavActive(loc.pathname, to)) {
      e.preventDefault();
      scrollMainToTop();
    }
  };

  // Custom <main> isn't covered by the router's window scroll restoration — remember
  // position per path so returning to Home/Dashboard (and other pages) stays where you left.
  useLayoutEffect(() => {
    setMoreOpen(false);
    const el = mainRef.current;
    if (!el) return;
    const prev = prevPathRef.current;
    if (prev !== loc.pathname) {
      saveMainScroll(prev, el.scrollTop);
      prevPathRef.current = loc.pathname;
    }
    const top = readMainScroll(loc.pathname);
    el.scrollTo({ top, behavior: "auto" });
    // Content height can settle after paint (async lists); re-apply once.
    requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTo({ top, behavior: "auto" });
    });
  }, [loc.pathname]);

  const portal = useParentPortal();
  const headerUnread = useConnectUnreadBadge(role, portal);
  const alertUnread = useConnectAlertBadge(role);
  const appLockEnabled = useSyncExternalStore(
    appLockStore.subscribe,
    appLockStore.isEnabled,
    () => false,
  );
  const appLockUnlocked = useSyncExternalStore(
    appLockStore.subscribe,
    appLockStore.isUnlocked,
    () => true,
  );
  const isSettingsRoute = useIsConnectSettingsRoute();
  const showAppLock = appLockEnabled && !appLockUnlocked && !isSettingsRoute;

  if (!hydrated) {
    return (
      <div className="flex h-screen-dvh items-center justify-center bg-background">
        <div className="connect-hydrate-spinner" role="status" aria-label="Loading" />
      </div>
    );
  }

  if (!user || !role) return null;

  const useModuleColors =
    role === "student" || role === "parent" || role === "teacher";

  const navLink = (n: NavItem, compact?: "sidebar" | "rail" | "mobile") => {
    const active = isNavActive(loc.pathname, n.to);
    const moduleColor = useModuleColors ? n.moduleColor : undefined;
    const isColoredMobile = useModuleColors && compact === "mobile" && moduleColor;
    const showAlertBadge = n.to === "/alerts" && alertUnread > 0;

    if (isColoredMobile) {
      const shortLabel =
        (role === "parent"
          ? PARENT_MOBILE_SHORT_LABELS
          : role === "teacher" && useActivityNav
            ? ACTIVITY_MOBILE_SHORT_LABELS
            : role === "teacher"
              ? TEACHER_MOBILE_SHORT_LABELS
              : STUDENT_MOBILE_SHORT_LABELS)[n.to] ?? n.label;
      return (
        <Link
          key={n.to}
          to={n.to}
          preload="intent"
          className={cn(
            "connect-nav-item student-mobile-nav-item relative",
            active && "student-mobile-nav-item--active",
          )}
          style={
            active
              ? ({ ["--nav-accent" as string]: moduleColor.primary } as CSSProperties)
              : undefined
          }
          title={n.label}
          aria-current={active ? "page" : undefined}
          aria-label={n.label}
          onClick={(e) => {
            if (active) {
              e.preventDefault();
              scrollMainToTop();
            }
          }}
        >
          <span
            className="student-mobile-nav-icon"
            style={studentMobileNavIconStyle(moduleColor, active)}
          >
            <n.icon className={cn("size-[1.125rem]", active && "stroke-[2.5]")} />
            {showAlertBadge ? (
              <span className="absolute -top-0.5 right-2 flex min-w-[1rem] h-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                {formatUnreadBadgeCount(alertUnread)}
              </span>
            ) : null}
          </span>
            <span className="student-mobile-nav-label">{shortLabel}</span>
        </Link>
      );
    }

    const base =
      compact === "rail"
        ? "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 transition-colors touch-manipulation"
        : compact === "mobile"
          ? "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl motion-fast transition-colors select-none touch-manipulation"
          : "flex items-center gap-3 px-3 py-2.5 rounded-xl motion-fast transition-colors";

    const activeCls =
      compact === "mobile"
        ? active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-white dark:bg-card text-primary"
        : active
          ? "bg-primary text-primary-foreground shadow-glow"
          : compact === "rail"
            ? "text-sidebar-foreground hover:bg-sidebar-accent"
            : "text-sidebar-foreground hover:bg-sidebar-accent";

    const coloredSidebarActive =
      useModuleColors && compact !== "mobile" && compact !== "rail" && active && moduleColor;

    return (
      <Link
        key={n.to}
        to={n.to}
        preload="intent"
        className={cn(
          "connect-nav-item",
          base,
          activeCls,
          showAlertBadge && "relative",
          coloredSidebarActive &&
            "bg-white dark:bg-card shadow-sm ring-1 ring-border font-medium",
        )}
        style={
          coloredSidebarActive
            ? { boxShadow: `inset 3px 0 0 ${moduleColor.primary}` }
            : undefined
        }
        title={n.label}
        aria-current={active ? "page" : undefined}
        onClick={(e) => {
          if (compact === "mobile" && active) {
            e.preventDefault();
            scrollMainToTop();
          }
        }}
      >
        {compact === "mobile" ? (
          <>
            <div
              className={cn(
                "p-1.5 rounded-lg motion-fast transition-colors",
                active ? "text-primary-foreground" : "text-primary",
              )}
            >
              <n.icon className={cn("size-[1.15rem]", active && "stroke-[2.5]")} />
            </div>
            <span className="max-w-full truncate px-0.5 text-center leading-none">{n.label}</span>
          </>
        ) : compact === "rail" ? (
          <>
            <n.icon
              className={cn("size-5 shrink-0", active && "stroke-[2.5]")}
              style={
                moduleColor ? { color: active ? "#FFFFFF" : moduleColor.primary } : undefined
              }
            />
            <span
              className={cn(
                "max-w-full truncate text-center leading-none",
                useModuleColors ? "student-module-name" : "text-[10px]",
              )}
            >
              {n.label.split(" ")[0]}
            </span>
          </>
        ) : (
          <>
            <n.icon
              className="size-4 shrink-0"
              style={moduleColor ? { color: moduleColor.primary } : undefined}
            />
            <span className={useModuleColors ? "student-module-name" : "text-sm"}>
              {n.label}
            </span>
          </>
        )}
        {showAlertBadge ? (
          <span className="absolute top-1.5 right-2 flex min-w-[1rem] h-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {formatUnreadBadgeCount(alertUnread)}
          </span>
        ) : null}
      </Link>
    );
  };

  return (
    <div className="relative flex h-screen-svh max-h-screen-svh flex-col overflow-hidden bg-background text-foreground">
      {showAppLock && (
        <div className="absolute inset-0 z-[300]">
          <AppLockScreen onUnlocked={() => appLockStore.setUnlocked(true)} />
        </div>
      )}
      <header className="z-40 shrink-0 safe-area-pt safe-area-px app-top-bar sticky top-0 border-b border-border">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-8 h-14 md:h-16 min-h-14 touch-manipulation">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <PortalMark role={role} size="sm" />
            <div className="hidden min-w-0 sm:block">
              <div className="font-display font-semibold leading-none text-sm md:text-base">
                LumenX Connect
              </div>
              <div className="truncate text-[10px] md:text-[11px] text-muted-foreground" title={institute?.name}>
                {portalSubtitle}
                {institute ? ` · ${institute.code}` : ""}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-2 min-w-0">
            {role === "student" && loc.pathname !== "/" && (
              <Link to="/" preload="intent" aria-label="Home">
                <Button variant="ghost" size="icon" className="connect-icon-btn shrink-0">
                  <Home className="size-5" />
                </Button>
              </Link>
            )}
            {isTeacher &&
              (useActivityNav
                ? !(
                    loc.pathname === ACTIVITY_WORKSPACE_BASE ||
                    loc.pathname === `${ACTIVITY_WORKSPACE_BASE}/`
                  )
                : loc.pathname !== "/") && (
                <Link
                  to={useActivityNav ? ACTIVITY_WORKSPACE_BASE : "/"}
                  preload="intent"
                  aria-label="Home"
                >
                  <Button variant="ghost" size="icon" className="connect-icon-btn shrink-0">
                    <Home className="size-5" />
                  </Button>
                </Link>
              )}
            <GlobalSearch />
            <PendingSyncBadge className="hidden sm:inline-flex" />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="connect-icon-btn hidden sm:inline-flex"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Link to={useActivityNav ? `${ACTIVITY_WORKSPACE_BASE}/notifications` : "/notifications"}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={
                  headerUnread > 0
                    ? `Notifications, ${headerUnread} unread`
                    : "Notifications"
                }
                className="connect-icon-btn relative"
              >
                <Bell className="size-5" />
                {headerUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] h-[1.125rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                    {formatUnreadBadgeCount(headerUnread)}
                  </span>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-2 gap-2" aria-label="Account menu">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(user.name, 2)}
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
                <DropdownMenuItem
                  className="flex items-center justify-between gap-3"
                  onSelect={(e) => e.preventDefault()}
                >
                  <span className="flex items-center gap-2">
                    <Moon className="size-4" />
                    Dark mode
                  </span>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={() => toggleTheme()}
                    aria-label="Toggle dark mode"
                  />
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    nav({ to: "/login" });
                  }}
                  className="text-destructive"
                >
                  <LogOut className="size-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {role === "parent" && <ParentContextBar />}
      {useActivityNav && <ActivityWorkspaceContextBar />}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Mid-width icon rail (tablets, unfolded foldables, landscape phones: 768-1023px) */}
        <aside className="hidden md:flex lg:hidden w-[4.5rem] shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden">
          <nav
            aria-label="Main navigation"
            className="flex-1 overflow-y-auto overscroll-contain py-3 px-1.5 flex flex-col gap-1"
          >
            {items.map((n) => navLink(n, "rail"))}
          </nav>
        </aside>
        {/* Full sidebar (desktop: >=1024px) */}
        <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden">
          <nav
            aria-label="Main navigation"
            className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-0.5"
          >
            {items.map((n) => navLink(n))}
          </nav>
          <div className="shrink-0 border-t border-border px-4 py-3 text-[10px] text-muted-foreground">
            {portalSubtitle} · v2
          </div>
        </aside>

        <main
          ref={mainRef}
          className={cn(
            "flex-1 min-w-0 overflow-y-auto overscroll-contain safe-area-px lg:pb-8",
            keyboardOpen
              ? "pb-4"
              : "pb-[calc(5.25rem+var(--safe-area-bottom))]",
          )}
        >
          <div className="lx-module-swipe-stage mx-auto w-full min-w-0 max-w-6xl px-4 py-4 md:px-8 md:py-5">
            <ModuleTransitionRoot
              pathname={loc.pathname}
              primaryPaths={swipePrimaryPaths}
              morePaths={swipeMorePaths}
              settingsPath={settingsPath}
              isActive={isNavActive}
              enabled={isMobileSwipe}
              className={cn("min-w-0", !isMobileSwipe && "lg:animate-in-up")}
            >
              <div
                key={
                  role === "parent" && loc.pathname !== "/profile" ? activeChildId : undefined
                }
                className="min-w-0"
              >
                {children ?? (
                  <RouteOutletErrorBoundary>
                    <Outlet />
                  </RouteOutletErrorBoundary>
                )}
              </div>
            </ModuleTransitionRoot>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className={cn(
          "md:hidden fixed bottom-0 inset-x-0 z-40 mobile-nav-bar border-t border-border safe-area-px transition-transform duration-200",
          logoutConfirm && "pointer-events-none",
          keyboardOpen && "translate-y-full pointer-events-none",
        )}
      >
        <div className="student-mobile-nav-bar mx-auto grid w-full grid-cols-5 gap-1 px-1.5 pt-1.5 pb-[max(0.45rem,var(--safe-area-bottom))] sm:gap-1.5 sm:px-3">
          {mobilePrimary.map((n) => navLink(n, "mobile"))}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  "connect-nav-item student-mobile-nav-item min-w-0",
                  moreMenuHasActive && "student-mobile-nav-item--active",
                )}
                aria-label="More modules"
              >
                <span
                  className="student-mobile-nav-icon"
                  style={
                    useModuleColors
                      ? moreMenuHasActive
                        ? { color: "#FFFFFF", backgroundColor: "var(--primary)" }
                        : { color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 14%, white)" }
                      : moreMenuHasActive
                        ? { color: "var(--primary-foreground)", backgroundColor: "var(--primary)" }
                        : { color: "var(--primary)", backgroundColor: "color-mix(in srgb, var(--primary) 14%, white)" }
                  }
                >
                  <MoreHorizontal className="size-[1.125rem]" />
                </span>
                <span className="student-mobile-nav-label">More</span>
              </button>
            </SheetTrigger>
            <MobileMoreSheetContent title={`More in ${ROLE_LABEL[role]}`}>
                <div className="grid grid-cols-3 gap-2">
                  {mobileSecondary.map((n) => {
                    const active = isNavActive(loc.pathname, n.to);
                    const moduleColor = useModuleColors ? n.moduleColor : undefined;
                    return (
                    <Link
                      key={n.to}
                      to={n.to}
                      preload="intent"
                      aria-current={active ? "page" : undefined}
                      onClick={(e) => handleMoreNavClick(n.to, e)}
                      className={cn(
                        "connect-more-tile motion-fast transition-colors",
                        useModuleColors
                          ? "student-more-tile"
                          : active
                            ? "border-primary bg-primary text-primary-foreground shadow-soft"
                            : "border-border bg-white dark:bg-card text-primary hover:bg-primary/[0.04]",
                      )}
                      style={
                        moduleColor && useModuleColors
                          ? studentMoreTileStyle(moduleColor, active)
                          : undefined
                      }
                    >
                      <div
                        className="student-mobile-nav-icon size-10"
                        style={
                          moduleColor && useModuleColors
                            ? studentMobileNavIconStyle(moduleColor, active)
                            : undefined
                        }
                      >
                        <n.icon className="size-5" />
                      </div>
                      <span
                        className={cn(
                          "student-module-name text-center text-foreground line-clamp-2",
                          active && moduleColor && "font-semibold",
                        )}
                        style={
                          active && moduleColor
                            ? { color: moduleColor.primary }
                            : undefined
                        }
                      >
                        {n.label}
                      </span>
                    </Link>
                    );
                  })}
                </div>
                <div className="mt-6 border-t border-border pt-4 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        nav({
                          to: useActivityNav ? "/activity/profile" : "/profile",
                          search: { section: "help" },
                        });
                      }}
                      className="connect-more-footer-btn"
                    >
                      <HelpCircle className="size-4 text-primary shrink-0" />
                      Help
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        nav({
                          to: useActivityNav ? "/activity/profile" : "/profile",
                          search: { section: "report" },
                        });
                      }}
                      className="connect-more-footer-btn"
                    >
                      <Flag className="size-4 text-primary shrink-0" />
                      Report issue
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        nav({
                          to: useActivityNav ? "/activity/profile" : "/profile",
                          search: { section: "feedback" },
                        });
                      }}
                      className="connect-more-footer-btn"
                    >
                      <MessageSquarePlus className="size-4 text-primary shrink-0" />
                      Feedback
                    </button>
                    <button
                      type="button"
                      onClick={openLogoutConfirm}
                      className="connect-more-footer-btn connect-more-logout"
                    >
                      <LogOut className="size-4 shrink-0" />
                      Logout
                    </button>
                  </div>
                </div>
            </MobileMoreSheetContent>
          </Sheet>
        </div>
      </nav>

      <AlertDialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
        <AlertDialogContent className="connect-logout-dialog w-[min(100%,18.5rem)] rounded-2xl p-4 gap-3 sm:max-w-xs">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base">Sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              You will return to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-row justify-end gap-2 sm:flex-row sm:justify-end sm:space-x-0">
            <AlertDialogCancel className="mt-0 h-9 flex-1 rounded-xl px-3 text-sm sm:flex-none sm:min-w-[5.5rem]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-9 flex-1 rounded-xl px-3 text-sm sm:flex-none sm:min-w-[5.5rem] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setLogoutConfirm(false);
                setMoreOpen(false);
                signOut();
                nav({ to: "/login" });
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
