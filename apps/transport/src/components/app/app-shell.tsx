import { useEffect, useMemo, useRef } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { BottomNavigation } from "@/components/ui/bottom-navigation";
import { ROUTES, getActivePrimaryNavId, PRIMARY_NAV, MORE_NAV } from "@/constants";
import { useAlerts } from "@/hooks/use-alerts";
import { useDriverAssignment } from "@/hooks/use-driver-assignment";
import { useTripLocationGuard } from "@/hooks/use-trip-location-guard";
import { useTransportAuth } from "@/lib/auth";
import {
  useSwipeNavigation,
  toSwipeNavItems,
  ModuleTransitionRoot,
  navigateWithModuleTransition,
  getModuleNavDirection,
} from "@lumenx/ui";

import { LocationRequiredOverlay } from "./location-required-overlay";
import { TransportAppHeader } from "./transport-app-header";

const BOTTOM_NAV_BASE = PRIMARY_NAV.map((item) => ({
  id: item.id,
  label: item.label,
  icon: item.icon,
  moduleColor: item.moduleColor,
}));

/**
 * Authenticated app chrome: scrollable outlet + fixed bottom nav.
 */
export function AppShell() {
  const navigate = useNavigate();
  const { user, hydrated } = useTransportAuth();
  useTripLocationGuard();
  /** Keep trip / route-setup / attendance scoped to the signed-in driver. */
  useDriverAssignment();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const activeId = getActivePrimaryNavId(pathname);
  const mainRef = useRef<HTMLElement>(null);
  const unreadAlerts = useAlerts().filter((item) => item.unread).length;

  useEffect(() => {
    if (!hydrated) return;
    if (!user) void navigate({ to: ROUTES.login, replace: true });
  }, [hydrated, user, navigate]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  const swipePrimaryPaths = useMemo(
    () => toSwipeNavItems(PRIMARY_NAV.map((item) => item.path)),
    [],
  );
  const swipeMorePaths = useMemo(
    () => toSwipeNavItems(MORE_NAV.map((item) => item.path)),
    [],
  );

  useSwipeNavigation({
    containerRef: mainRef,
    pathname,
    primaryPaths: swipePrimaryPaths,
    morePaths: swipeMorePaths,
    enabled: Boolean(hydrated && user),
    settingsPath: ROUTES.settings,
    homePath: ROUTES.home,
    onNavigate: (to) => {
      const direction = getModuleNavDirection(pathname, to, swipePrimaryPaths, swipeMorePaths, {
        settingsPath: ROUTES.settings,
      });
      navigateWithModuleTransition(() => {
        void navigate({ to });
      }, direction);
    },
  });

  const items = BOTTOM_NAV_BASE.map((item) =>
    item.id === "notifications" && unreadAlerts > 0
      ? { ...item, badge: unreadAlerts }
      : item,
  );

  if (!hydrated || !user) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <a
        href="#transport-main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-elevated focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <TransportAppHeader />
      <main
        ref={mainRef}
        id="transport-main"
        className="mx-auto min-h-0 w-full max-w-[720px] flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 pt-4 pb-[calc(5.5rem+var(--safe-area-bottom))] sm:px-5 sm:pt-5"
      >
        <div className="lx-module-swipe-stage min-w-0 w-full">
          <ModuleTransitionRoot
            pathname={pathname}
            primaryPaths={swipePrimaryPaths}
            morePaths={swipeMorePaths}
            settingsPath={ROUTES.settings}
            className="min-w-0 w-full"
          >
            <Outlet />
          </ModuleTransitionRoot>
        </div>
      </main>
      <BottomNavigation
        items={items}
        activeId={activeId}
        onSelect={(id) => {
          if (id === activeId) {
            mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
            return;
          }
          const target = PRIMARY_NAV.find((item) => item.id === id);
          if (!target) return;
          const direction = getModuleNavDirection(
            pathname,
            target.path,
            swipePrimaryPaths,
            swipeMorePaths,
            { settingsPath: ROUTES.settings },
          );
          navigateWithModuleTransition(() => {
            void navigate({ to: target.path });
          }, direction);
        }}
      />
      <LocationRequiredOverlay />
    </div>
  );
}
