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
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { ThemeProvider } from "@/components/theme-provider";
import { AdminActionToastProvider } from "@/components/AdminActionToast";
import { AdminChrome } from "@/components/AdminChrome";
import { DemoProfileProvider } from "@/lib/demo-profile-context";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { AUTH_ROUTES } from "@/auth/constants";
import { isAppUnlocked, setAppUnlocked } from "@/auth/app-lock-store";
import { AppLockScreen } from "@/auth/components/AppLockScreen";

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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
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
 * • Auth routes  → rendered standalone (no AdminChrome)
 * • Authenticated + protected route → AdminChrome
 * • Unauthenticated + protected route → redirect to /welcome
 * • Loading → minimal spinner
 */
function AuthGate() {
  const { isAuthenticated, isLoading, status } = useAuth();
  const pathname  = useRouterState({ select: (s) => s.location.pathname });
  const navigate  = useNavigate();
  const [unlocked, setUnlocked] = useState(() => isAppUnlocked());

  const isAuthRoute = (AUTH_ROUTES as readonly string[]).includes(pathname);

  useEffect(() => {
    if (isAuthenticated) {
      setUnlocked(isAppUnlocked());
    } else {
      setUnlocked(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (status === "loading" || status === "idle") return;

    if (!isAuthenticated && !isAuthRoute) {
      navigate({ to: "/welcome", replace: true });
    }
    if (isAuthenticated && unlocked && (pathname === "/welcome" || pathname === "/login" || pathname === "/splash")) {
      navigate({ to: "/", replace: true });
    }
  }, [isAuthenticated, isAuthRoute, pathname, status, navigate, unlocked]);

  const handleUnlocked = () => {
    setAppUnlocked(true);
    setUnlocked(true);
    if (pathname === "/welcome" || pathname === "/login" || pathname === "/splash") {
      navigate({ to: "/", replace: true });
    }
  };

  // Auth routes (login, signup, etc.) — no chrome, no lock
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

  // Session active but app not unlocked this launch → PIN screen
  if (!unlocked) {
    return <AppLockScreen onUnlocked={handleUnlocked} />;
  }

  return <AdminChrome />;
}

// ── Root component ────────────────────────────────────────────

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DemoProfileProvider>
            <AdminActionToastProvider>
              <AuthGate />
            </AdminActionToastProvider>
          </DemoProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
