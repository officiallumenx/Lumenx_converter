import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  useNavigate,
  Outlet,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminActionToastProvider } from "@/components/AdminActionToast";
import { AdminChrome } from "@/components/AdminChrome";
import { DemoProfileProvider } from "@/lib/demo-profile-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AUTH_ROUTES, isPostAuthLanding } from "@/auth/constants";
import {
  registrationGatePath,
  resolveRegistrationGate,
} from "@/auth/registration-gate";
import { isApiAuthMode } from "@/auth/auth-mode";
import { resolveDemoAuthRouteBlock } from "@/auth/demo-auth-guard";
import { isAppLockRequired, resolveAppLockDemoRouteBlock } from "@/auth/app-lock-policy";
import { useApiRegistrationSync } from "@/auth/use-api-registration-sync";
import {
  isAppUnlocked,
  setAppUnlocked,
  subscribeAppUnlock,
} from "@/auth/app-lock-store";
import { AppLockScreen } from "@/auth/components/AppLockScreen";
import { useRolePermission } from "@/lib/roles-access";
import { LumenXNativeShell } from "@lumenx/capacitor/native-shell";
import { OfflineSyncHost, TypographyProvider } from "@lumenx/ui";
import { Toaster } from "@lumenx/ui/sonner";
import { InAppAlertListener } from "@/components/InAppAlertListener";
import { PushDeviceTokenRegistration } from "@/components/PushDeviceTokenRegistration";
import { subscribeInstituteRegistrations } from "@lumenx/utils";
import { useState } from "react";
import { syncAdminTenantForUser } from "@/lib/sync-admin-tenant";

// ── 404 ───────────────────────────────────────────────────────

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold tracking-tight">404</h1>
        <p className="mt-3 text-muted-foreground">
          This page doesn't exist in the LumenX Admin system.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          Back to Intelligence
        </Link>
      </div>
    </div>
  );
}

// ── Error boundary ────────────────────────────────────────────

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

// ── Route ─────────────────────────────────────────────────────

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "LumenX Admin — Institute Intelligence Center" },
      { name: "description", content: "Premium institute operating system for principals, heads, and administrators." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

// ── Auth gate ─────────────────────────────────────────────────

/**
 * AuthGate — sits between AuthProvider and the rest of the app.
 * • Auth routes → rendered standalone (no AdminChrome)
 * • Authenticated but app lock PIN not cleared this launch → AppLockScreen
 * • Authenticated + unlocked → AdminChrome for protected routes
 * • Unauthenticated + protected route → redirect to /welcome
 * • Loading → minimal spinner
 */
function AuthGate() {
  const { isAuthenticated, isLoading, status, user, patchAuthenticatedUser } = useAuth();
  const pathname  = useRouterState({ select: (s) => s.location.pathname });
  const navigate  = useNavigate();
  const appLockRequired = isAppLockRequired();
  const appUnlocked = useSyncExternalStore(subscribeAppUnlock, isAppUnlocked, () => false);
  const effectivelyUnlocked = !appLockRequired || appUnlocked;
  const routePermission = useRolePermission(user?.accessRoleId, pathname);
  const [, setRegTick] = useState(0);
  useApiRegistrationSync(isApiAuthMode() && isAuthenticated ? user : null, {
    onActivated: patchAuthenticatedUser,
  });

  useEffect(
    () => subscribeInstituteRegistrations(() => setRegTick((t) => t + 1)),
    [],
  );

  const isAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname);
  const registrationGate = resolveRegistrationGate(user);
  const gateRedirect = registrationGatePath(registrationGate.kind);
  const demoRouteBlock = resolveDemoAuthRouteBlock(pathname);
  const appLockRouteBlock = resolveAppLockDemoRouteBlock(pathname);

  useEffect(() => {
    if (isAuthenticated && !appLockRequired) {
      setAppUnlocked(true);
    }
  }, [isAuthenticated, appLockRequired]);

  useEffect(() => {
    const redirect = appLockRouteBlock ?? demoRouteBlock;
    if (!redirect || pathname === redirect) return;
    navigate({ to: redirect, replace: true });
  }, [appLockRouteBlock, demoRouteBlock, pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (registrationGate.kind !== "allow") return;
    try {
      syncAdminTenantForUser(user);
    } catch {
      // Tenant bind must not block dashboard after PIN / Enter dashboard.
    }
  }, [isAuthenticated, user, registrationGate.kind]);

  useLayoutEffect(() => {
    if (status === "loading" || status === "idle") return;

    if (!isAuthenticated && !isAuthRoute && pathname !== "/welcome") {
      navigate({ to: "/welcome", replace: true });
      return;
    }

    if (!isAuthenticated) return;

    // Incomplete registration: force OTP → setup → pending (no dashboard).
    if (registrationGate.kind === "loading") {
      return;
    }

    if (registrationGate.kind !== "allow" && gateRedirect && pathname !== gateRedirect) {
      navigate({ to: gateRedirect, replace: true });
      return;
    }

    // Fully allowed: leave registration-only routes (except pending status screen).
    if (registrationGate.kind === "allow") {
      const leaveRegistration =
        pathname === "/signup" ||
        pathname === "/verify-email-otp" ||
        pathname === "/verify-mobile-otp" ||
        pathname === "/institute-setup";
      if (leaveRegistration) {
        navigate({ to: "/", replace: true });
        return;
      }
      if (effectivelyUnlocked && isPostAuthLanding(pathname)) {
        navigate({ to: "/", replace: true });
      }
    }
  }, [
    isAuthenticated,
    isAuthRoute,
    pathname,
    status,
    navigate,
    effectivelyUnlocked,
    registrationGate.kind,
    gateRedirect,
  ]);

  useEffect(() => {
    if (
      isAuthenticated &&
      registrationGate.kind === "allow" &&
      effectivelyUnlocked &&
      user?.accessRoleId &&
      !isAuthRoute &&
      routePermission === "none" &&
      pathname !== "/"
    ) {
      navigate({ to: "/", replace: true });
    }
  }, [
    isAuthenticated,
    registrationGate.kind,
    effectivelyUnlocked,
    user?.accessRoleId,
    isAuthRoute,
    routePermission,
    pathname,
    navigate,
  ]);

  const handleUnlocked = useCallback(() => {
    setAppUnlocked(true);
    const gate = resolveRegistrationGate(user);
    const path = registrationGatePath(gate.kind);
    if (path) {
      navigate({ to: path, replace: true });
      return;
    }
    // Stay on current protected route, or land on home from login/welcome.
    if (isPostAuthLanding(pathname) || pathname === "/pending-verification") {
      navigate({ to: "/", replace: true });
    }
  }, [pathname, navigate, user]);

  // Auth routes (login, signup, OTP, pending) — no chrome, no lock
  if (isAuthRoute) {
    return <Outlet />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (registrationGate.kind === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Loading institute registration status…
        </p>
      </div>
    );
  }

  // Block Admin chrome until Nexus approves — redirect (layout effect) + fallback UI
  if (registrationGate.kind !== "allow") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <div className="size-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <div className="max-w-sm space-y-2">
          <p className="text-sm font-medium text-foreground">
            {registrationGate.kind === "rejected"
              ? "Registration was declined"
              : registrationGate.kind === "error"
                ? "Registration status unavailable"
                : "Institute Registration Under Review"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {registrationGate.kind === "error"
              ? registrationGate.errorMessage ??
                "Could not load registration status from the API."
              : "Dashboard stays locked until your institute is approved. You can check status on the pending page."}
          </p>
          {gateRedirect && (
            <Link
              to={gateRedirect}
              className="inline-flex text-xs font-medium text-primary hover:underline"
            >
              Open status page
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Session active but app not unlocked this launch → PIN screen
  if (!effectivelyUnlocked) {
    return <AppLockScreen onUnlocked={handleUnlocked} />;
  }

  return <AdminChrome />;
}

// ── Root component ────────────────────────────────────────────

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <LumenXNativeShell />
      <ThemeProvider>
        <AuthProvider>
          <DemoProfileProvider>
            <AdminActionToastProvider>
              <OfflineSyncHost app="admin" seedDemo={false} topStatus={false} className="min-h-screen-dvh">
                <TypographyProvider>
                  <InAppAlertListener />
                  <PushDeviceTokenRegistration enabled />
                  <AuthGate />
                </TypographyProvider>
              </OfflineSyncHost>
              <Toaster position="top-center" richColors />
            </AdminActionToastProvider>
          </DemoProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
