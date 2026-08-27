import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Search, ChevronRight, Sparkles, Bell, Sun, Moon, Menu,
  LogOut, User, ChevronDown, MoreHorizontal, Settings,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useTheme } from "@/components/theme-provider";
import { AdminGlobalSearch } from "@/components/AdminGlobalSearch";
import { adminNav } from "@/lib/admin-nav";
import {
  adminMobileNavIconStyle,
  adminMoreTileStyle,
  adminSidebarAccentStyle,
  getAdminModuleColor,
  getAdminModuleColorForPath,
} from "@/lib/admin-module-colors";
import { isAdminRouteModuleEnabled, useEnabledModules } from "@/lib/admin-plan-config";
import { IconChip } from "@/components/IconChip";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { useSignOut } from "@/auth/hooks/useSignOut";
import { useAuth } from "@/auth/AuthContext";
import { getRolePermission, useRolesAccessRevision } from "@/lib/roles-access";
import { attachScrollChain } from "@/lib/scroll-chain";
import { AdminSubscriptionLifecycleBanner } from "@/components/AdminSubscriptionLifecycleBanner";
import { AdminRenewalReminderBanner } from "@/components/AdminRenewalReminderBanner";
import { AdminBillingAdjustmentBanner } from "@/components/AdminBillingAdjustmentBanner";
import { AdminPlatformReadOnlyBanner } from "@/components/AdminPlatformReadOnlyBanner";
import { OfflineSyncStatusBar } from "@/components/OfflineSyncStatusBar";
import { RouteOutletErrorBoundary } from "@/components/RouteOutletErrorBoundary";
import { loadAcademicYears } from "@/lib/academic-management-data";
import {
  adminWriteBlockReason,
  canAdminMutate,
} from "@/lib/admin-write-access";
import { syncAdminSubscriptionAccess } from "@/lib/sync-admin-subscription-access";
import {
  getInitials,
  subscribeSubscriptions,
  syncAcademicYearLocked,
} from "@lumenx/utils";
import {
  PendingSyncBadge,
  OfflineBanner,
  OfflineSyncProgress,
  useIsMobile,
  useSwipeNavigation,
  toSwipeNavItems,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  cn,
  ModuleTransitionRoot,
  navigateWithModuleTransition,
  getModuleNavDirection,
  Button,
  Switch,
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lumenx/ui";
import {
  getAdminUnreadCount,
  subscribeAdminNotifications,
} from "@/lib/notification-center-store";
import { startTransportAdminNotificationSync } from "@/lib/transport-notification-sync";
import { ApiInstituteSwitcher } from "@/components/ApiInstituteSwitcher";
import { isApiAuthMode } from "@/auth/auth-mode";
import { InstituteContextProvider } from "@/lib/institutes";
import { warnAdminNavContractIfNeeded } from "@/lib/admin-navigation-contract";
import { useAdminMountTrace, useAdminRouteTransitionTrace } from "@/hooks/useAdminPerformanceTrace";
import { AdminWriteAccessProvider } from "@/components/admin-write/AdminWriteAccessContext";
import {
  getAdminSectionForPath,
  getAdminSectionItems,
  isRouteActive,
} from "@/lib/admin-section-nav";

export function AdminChrome() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const isTransitioning = useRouterState({ select: (s) => s.isTransitioning });
  const navBusy = isLoading || isTransitioning;
  useAdminMountTrace("AdminChrome");
  useAdminRouteTransitionTrace(path, navBusy);
  const { profile } = useDemoProfile();
  const { user } = useAuth();
  const rolesRevision = useRolesAccessRevision();
  const signOut = useSignOut();
  const [notifUnread, setNotifUnread] = useState(() => getAdminUnreadCount());

  useEffect(() => {
    startTransportAdminNotificationSync();
    setNotifUnread(getAdminUnreadCount());
    return subscribeAdminNotifications(() => setNotifUnread(getAdminUnreadCount()));
  }, []);

  const [openSearch, setOpenSearch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const moduleEnabled = useEnabledModules();
  const profileRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    warnAdminNavContractIfNeeded();
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const syncKeyboard = () => {
      const open = window.innerHeight - vv.height - vv.offsetTop > 80;
      document.documentElement.classList.toggle("lx-keyboard-open", open);
    };
    syncKeyboard();
    vv.addEventListener("resize", syncKeyboard);
    vv.addEventListener("scroll", syncKeyboard);
    return () => {
      vv.removeEventListener("resize", syncKeyboard);
      vv.removeEventListener("scroll", syncKeyboard);
      document.documentElement.classList.remove("lx-keyboard-open");
    };
  }, []);

  useEffect(() => {
    // Subscription SoT → existing platform-readonly write-gate (no duplicate lock).
    try {
      syncAdminSubscriptionAccess();
      const active = loadAcademicYears().find((y) => y.status === "active");
      // Locked when there is no active academic year (completed/archived only).
      syncAcademicYearLocked({
        locked: !active,
        yearLabel: active?.label,
      });
    } catch {
      // Never let subscription sync freeze Admin chrome after unlock.
    }
  }, [profile]);

  useEffect(() => {
    return subscribeSubscriptions(() => {
      try {
        syncAdminSubscriptionAccess();
      } catch {
        // ignore
      }
    });
  }, []);

  const visibleNav = useMemo(
    () =>
      adminNav
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            if (user?.accessRoleId && getRolePermission(user.accessRoleId, item.to) === "none") {
              return false;
            }
            return isAdminRouteModuleEnabled(item.to, moduleEnabled);
          }),
        }))
        .filter((group) => group.items.length > 0),
    [user?.accessRoleId, moduleEnabled, rolesRevision],
  );

  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  /** Drawer section driving the mobile bottom nav (config order, not flattened). */
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const sectionForPath = useMemo(() => {
    return getAdminSectionForPath(path, visibleNav);
  }, [visibleNav, path]);

  useEffect(() => {
    if (sectionForPath) setSelectedSection(sectionForPath);
  }, [sectionForPath]);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  const activeSectionLabel = selectedSection ?? sectionForPath;

  const activeSectionItems = useMemo(() => {
    return getAdminSectionItems(activeSectionLabel, visibleNav);
  }, [visibleNav, activeSectionLabel]);

  const sectionPrimaryItems = useMemo(
    () => activeSectionItems.slice(0, 4),
    [activeSectionItems],
  );
  const sectionMoreItems = useMemo(
    () => activeSectionItems.slice(4),
    [activeSectionItems],
  );

  const swipePrimaryPaths = useMemo(
    () => toSwipeNavItems(sectionPrimaryItems.map((item) => item.to)),
    [sectionPrimaryItems],
  );
  const swipeMorePaths = useMemo(
    () => toSwipeNavItems(sectionMoreItems.map((item) => item.to)),
    [sectionMoreItems],
  );

  const settingsPath =
    visibleNav.flatMap((g) => g.items).find((item) => item.label === "Settings")?.to ?? "/settings";

  const goToAdminModule = useCallback(
    (to: string) => {
      setMoreOpen(false);
      setMobileOpen(false);
      const direction = getModuleNavDirection(path, to, swipePrimaryPaths, swipeMorePaths, {
        settingsPath,
      });
      navigateWithModuleTransition(() => {
        void navigate({ to: to as never });
      }, direction);
    },
    [navigate, path, settingsPath, swipeMorePaths, swipePrimaryPaths],
  );

  useSwipeNavigation({
    containerRef: mainRef,
    pathname: path,
    primaryPaths: swipePrimaryPaths,
    morePaths: swipeMorePaths.length > 0 ? swipeMorePaths : undefined,
    enabled: isMobile,
    homePath: sectionPrimaryItems[0]?.to,
    onSwipePrevFromFirst: () => setMobileOpen(true),
    onNavigate: (to) => {
      goToAdminModule(to);
    },
  });

  const [openSection, setOpenSection] = useState<string | null>(sectionForPath);

  useEffect(() => {
    if (sectionForPath) setOpenSection(sectionForPath);
  }, [sectionForPath]);

  const toggleSection = (label: string) => {
    setOpenSection((prev) => (prev === label ? null : label));
    setSelectedSection(label);
  };
  const displayName = user?.name ?? profile.admin.principalName;
  const displayTitle = user?.title ?? profile.admin.principalTitle;
  const displayIdentity = user?.email || user?.phone || "Admin user";
  const moduleColor = getAdminModuleColor(path);
  const chromeAccentStyle = {
    ["--lx-module-accent" as string]: moduleColor.primary,
    ["--lx-module-chip" as string]: moduleColor.iconBackground,
  } as CSSProperties;
  const canAccessSettings =
    !user?.accessRoleId || getRolePermission(user.accessRoleId, "/settings") !== "none";
  const writesAllowed = canAdminMutate(user?.accessRoleId, path);
  const writeBlockReason = adminWriteBlockReason(user?.accessRoleId, path);
  const displayInitials = user?.initials ?? getInitials(displayName, 2);
  const apiMode = isApiAuthMode();

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

  // When an inner page scroller hits its end, continue on the main page scrollbar
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    return attachScrollChain(main);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    signOut();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenSearch((prev) => !prev);
        return;
      }
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

  /** True when this nav href is the in-flight route transition target. */
  const isNavigatingToItem = (to: string) => {
    if (!navBusy) return false;
    return to === "/" ? path === "/" : path.startsWith(to);
  };

  const SidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-6 h-16 border-b border-sidebar-border shrink-0">
        <span className="lx-icon-chip lx-icon-chip--sm shadow-glow" aria-hidden>
          <Sparkles strokeWidth={2} />
        </span>
        <div className="leading-tight min-w-0">
          <div className="font-semibold tracking-tight text-sm">LUMENX ADMIN</div>
          {apiMode ? (
            <ApiInstituteSwitcher className="mt-0.5" />
          ) : (
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate max-w-[11rem]">
              {profile.admin.headerSubtitle}
            </div>
          )}
        </div>
      </div>
      <nav
        className="flex-1 overflow-y-auto lx-sidebar-scroll px-3 py-4 space-y-1"
        aria-label="Main navigation"
      >
        {visibleNav.map((group) => {
          const open = openSection === group.label;
          const panelId = `nav-section-${group.label.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div key={group.label} className="rounded-lg">
              <button
                type="button"
                onClick={() => toggleSection(group.label)}
                aria-expanded={open}
                aria-controls={panelId}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left transition-colors ${
                  open
                    ? "bg-sidebar-accent text-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                }`}
              >
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-[0.16em]">
                  {group.label}
                </span>
                <ChevronDown
                  className={`size-3.5 shrink-0 transition-transform duration-200 ${
                    open ? "rotate-0" : "-rotate-90"
                  }`}
                />
              </button>
              {open ? (
                <div id={panelId} className="mt-0.5 space-y-0.5 pb-2" role="region" aria-label={group.label}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
                    const navPending = isNavigatingToItem(item.to);
                    const accent = getAdminModuleColorForPath(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        preload="intent"
                        onClick={() => setMobileOpen(false)}
                        aria-current={active ? "page" : undefined}
                        style={adminSidebarAccentStyle(accent, active)}
                        className={`group relative flex items-center gap-3 rounded-md px-3 py-2.5 min-h-10 text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          active
                            ? "text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                        } ${navPending ? "lx-nav-item--pending" : ""}`}
                      >
                        <IconChip
                          icon={Icon}
                          size="sm"
                          accent={accent}
                          active={active}
                        />
                        <span className="flex-1">{item.label}</span>
                        {navPending && (
                          <span className="size-1.5 rounded-full bg-primary lx-nav-pulse" aria-hidden />
                        )}
                        {active && !navPending && <ChevronRight className="size-3.5 opacity-70" />}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
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
                  {displayInitials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{displayTitle}</div>
                  <div className="text-[10px] text-primary truncate mt-0.5">{displayIdentity}</div>
                </div>
              </div>
            </div>
            {/* Menu items */}
            {canAccessSettings && <div className="p-1.5 space-y-0.5">
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
            </div>}
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
            {displayInitials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-xs font-medium truncate">{displayName}</div>
            <div className="text-[10px] text-muted-foreground truncate">{displayTitle}</div>
          </div>
          <ChevronDown className={`size-3.5 text-muted-foreground shrink-0 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
        </button>
      </div>
    </>
  );

  return (
    <InstituteContextProvider>
    <AdminWriteAccessProvider writesAllowed={writesAllowed} reason={writeBlockReason}>
      <div
      className="flex h-screen-svh max-h-screen-svh w-full overflow-hidden bg-background text-foreground"
      style={chromeAccentStyle}
      >
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
            className="lx-admin-sidebar lx-admin-mobile-drawer w-[min(18rem,88vw)] h-full flex flex-col border-r border-sidebar-border animate-entrance shadow-pop"
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
        <header
          data-admin-nav
          className="lx-admin-header app-top-bar sticky top-0 z-40 shrink-0 safe-area-pt safe-area-px border-b border-border"
        >
          <div
            className={`lx-nav-progress ${navBusy ? "lx-nav-progress--active" : ""}`}
            aria-hidden
          />
          <div className="flex h-14 min-h-14 w-full items-center gap-2 px-3 touch-manipulation md:h-16 md:gap-3 md:px-8">
            <div className="flex min-w-0 items-center gap-2 md:gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open navigation menu"
                onClick={() => setMobileOpen(true)}
                className="lx-admin-icon-btn shrink-0 lg:hidden"
              >
                <Menu className="size-5" />
              </Button>
              <span className="lx-icon-chip lx-icon-chip--sm shrink-0 shadow-glow" aria-hidden>
                <Sparkles strokeWidth={2} />
              </span>
              <div className="hidden min-w-0 sm:block">
                <div className="font-display text-sm font-semibold leading-none">
                  LumenX Admin
                </div>
                {apiMode ? (
                  <ApiInstituteSwitcher className="mt-0.5 max-w-[14rem]" />
                ) : (
                  <div
                    className="truncate text-[10px] text-muted-foreground md:text-[11px]"
                    title={profile.admin.headerSubtitle}
                  >
                    {profile.admin.headerSubtitle}
                  </div>
                )}
              </div>
            </div>

            <div className="ml-auto flex min-w-0 items-center gap-1 md:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Open search"
                onClick={() => setOpenSearch(true)}
                className="lx-admin-icon-btn md:hidden"
              >
                <Search className="size-5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenSearch(true)}
                className="hidden h-9 gap-2 rounded-xl pr-2 font-normal text-muted-foreground md:inline-flex"
              >
                <Search className="size-4" />
                <span>Search…</span>
                <kbd className="ml-2 hidden items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium lg:inline-flex">
                  Ctrl K
                </kbd>
              </Button>
              <PendingSyncBadge className="hidden sm:inline-flex lg:hidden" />
              <div className="hidden lg:block">
                <OfflineSyncStatusBar compact />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggle}
                aria-label="Toggle theme"
                className="lx-admin-icon-btn hidden sm:inline-flex"
              >
                {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
              </Button>
              <Link to="/notifications" search={{ tab: "inbox" }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={
                    notifUnread > 0
                      ? `Notifications, ${notifUnread} unread`
                      : "Notifications"
                  }
                  className="lx-admin-icon-btn relative"
                >
                  <Bell className="size-5" />
                  {notifUnread > 0 ? (
                    <span className="absolute -top-0.5 -right-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                      {notifUnread > 99 ? "99+" : notifUnread > 9 ? "9+" : notifUnread}
                    </span>
                  ) : null}
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2" aria-label="Account menu">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                        {displayInitials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>
                    <div className="font-medium">{displayName}</div>
                    <div className="text-xs text-muted-foreground">{displayIdentity}</div>
                    <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                      <span className="size-1.5 rounded-full bg-success" /> {displayTitle}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {canAccessSettings ? (
                    <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                      <Settings className="mr-2 size-4" /> Settings
                    </DropdownMenuItem>
                  ) : null}
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
                      onCheckedChange={() => toggle()}
                      aria-label="Toggle dark mode"
                    />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="shrink-0">
          <OfflineBanner />
          <OfflineSyncProgress />
        </div>

        <main
          ref={mainRef}
          id="main-content"
          className="relative z-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain scroll-smooth px-3 sm:px-5 md:px-6 pt-3 pb-[calc(var(--lx-mobile-nav-height)+0.75rem)] sm:pt-4 lg:pt-6 lg:pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <AdminSubscriptionLifecycleBanner />
          <AdminRenewalReminderBanner />
          <AdminBillingAdjustmentBanner />
          <AdminPlatformReadOnlyBanner />
          <div className="lx-module-swipe-stage min-w-0 w-full">
            <ModuleTransitionRoot
              pathname={path}
              primaryPaths={swipePrimaryPaths}
              morePaths={swipeMorePaths.length > 0 ? swipeMorePaths : undefined}
              settingsPath={settingsPath}
              enabled={isMobile}
              className="min-w-0"
            >
              <RouteOutletErrorBoundary key={path}>
                <Outlet />
              </RouteOutletErrorBoundary>
            </ModuleTransitionRoot>
          </div>
        </main>

        {/* Section-scoped mobile bottom nav — order from active drawer section only */}
        {sectionPrimaryItems.length > 0 ? (
          <nav
            aria-label={activeSectionLabel ? `${activeSectionLabel} modules` : "Section modules"}
            data-admin-nav
            className="lx-admin-bottom-nav lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border"
          >
            <div
              className="mx-auto grid w-full max-w-lg gap-0.5 px-1.5 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]"
              style={{
                gridTemplateColumns: `repeat(${
                  sectionMoreItems.length > 0
                    ? 5
                    : Math.min(Math.max(sectionPrimaryItems.length, 1), 4)
                }, minmax(0, 1fr))`,
              }}
            >
              {sectionPrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = isRouteActive(path, item.to);
                const accent = getAdminModuleColorForPath(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    preload="intent"
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className={cn(
                      "lx-admin-nav-item",
                      active && "lx-admin-nav-item--active",
                    )}
                    style={
                      active
                        ? ({ ["--nav-accent" as string]: accent.primary } as CSSProperties)
                        : undefined
                    }
                  >
                    <span className="lx-admin-nav-icon" style={adminMobileNavIconStyle(accent, active)}>
                      <Icon className={cn("size-[1.125rem]", active && "stroke-[2.5]")} />
                    </span>
                    <span className="lx-admin-nav-label">{item.label}</span>
                  </Link>
                );
              })}
              {sectionMoreItems.length > 0 ? (
                <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "lx-admin-nav-item",
                        sectionMoreItems.some((item) =>
                          isRouteActive(path, item.to),
                        ) && "lx-admin-nav-item--active",
                      )}
                      aria-label={`More in ${activeSectionLabel ?? "section"}`}
                    >
                      <span className="lx-admin-nav-icon lx-admin-nav-icon--more">
                        <MoreHorizontal className="size-[1.125rem]" />
                      </span>
                      <span className="lx-admin-nav-label">More</span>
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="flex max-h-[min(88dvh,calc(100dvh-0.75rem))] flex-col gap-0 rounded-t-2xl border-t p-0 [&>button]:hidden"
                  >
                    <div className="shrink-0 border-b border-border px-5 pb-3 pt-2">
                      <div
                        className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30"
                        aria-hidden
                      />
                      <SheetTitle className="text-left text-base">
                        {activeSectionLabel ? `More · ${activeSectionLabel}` : "More"}
                      </SheetTitle>
                      <SheetDescription className="sr-only">
                        Remaining modules in this section
                      </SheetDescription>
                    </div>
                    <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                      {sectionMoreItems.map((item) => {
                        const Icon = item.icon;
                        const active =
                          isRouteActive(path, item.to);
                        const accent = getAdminModuleColorForPath(item.to);
                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            preload="intent"
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className="lx-admin-more-tile"
                            style={adminMoreTileStyle(accent, active)}
                          >
                            <span
                              className="lx-admin-nav-icon"
                              style={adminMobileNavIconStyle(accent, active)}
                            >
                              <Icon className="size-4" />
                            </span>
                            <span
                              className="min-w-0 flex-1 truncate"
                              style={active ? { color: accent.primary, fontWeight: 600 } : undefined}
                            >
                              {item.label}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
              ) : null}
            </div>
          </nav>
        ) : null}
      </div>

      {openSearch ? <AdminGlobalSearch open={openSearch} onOpenChange={setOpenSearch} /> : null}
      </div>
    </AdminWriteAccessProvider>
    </InstituteContextProvider>
  );
}
