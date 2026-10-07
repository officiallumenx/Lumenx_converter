import { useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import { LumenXNativeShell } from "@lumenx/capacitor/native-shell";
import { OfflineSyncHost, TypographyProvider } from "@lumenx/ui";
import { Toaster } from "@lumenx/ui/sonner";

import { APP_NAME } from "@/constants";
import {
  clearTransportClientData,
} from "@/lib/transport/clear-stale-client-state";
import { TransportAuthProvider, getTransportAuthMode } from "@/lib/auth";
import { InAppAlertListener } from "@/components/app/InAppAlertListener";
import { PushDeviceTokenRegistration } from "@/components/app/PushDeviceTokenRegistration";
import { PushPermissionRecoveryBanner } from "@lumenx/notifications";
import { FirebaseClientServices } from "@/components/app/FirebaseClientServices";
import { TransportAlertsSync } from "@/components/app/TransportAlertsSync";
import { useSettings } from "@/hooks/use-settings";
import { applyThemeMode } from "@/lib/transport/settings";
import appCss from "../styles.css?url";

// Fail fast if demo mode is configured — product is API-only.
getTransportAuthMode();

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-[var(--width-auth)] text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const AUTO_RECOVER_FLAG = "lumenx.transport.error-auto-recover.v1";

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Unknown client error";

  // One automatic recover for poisoned local state / stale chunk loads.
  // Skip for update-depth loops (#185) — clearing storage cannot fix those and
  // reloading would just flash this screen forever.
  useEffect(() => {
    const isUpdateDepth =
      /#185|Maximum update depth/i.test(message);
    if (isUpdateDepth) return;
    try {
      if (sessionStorage.getItem(AUTO_RECOVER_FLAG) === "1") return;
      sessionStorage.setItem(AUTO_RECOVER_FLAG, "1");
      clearTransportClientData();
      window.location.replace("/login");
    } catch {
      /* ignore — fall through to manual buttons */
    }
  }, [message]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-[var(--width-auth)] text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn&apos;t load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Recovering… if this stays, clear local data or head home.
        </p>
        <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-[11px] text-destructive whitespace-pre-wrap">
          {message}
        </pre>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                sessionStorage.removeItem(AUTO_RECOVER_FLAG);
              } catch {
                /* ignore */
              }
              clearTransportClientData();
              window.location.assign("/login");
            }}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Clear data &amp; reload
          </button>
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: `${APP_NAME} — School Transport` },
      {
        name: "description",
        content: "LumenX Transport for drivers and school fleet operations.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-app="transport">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <TransportAuthProvider>
        <ThemeSync />
        <LumenXNativeShell />
        <OfflineSyncHost app="transport" className="min-h-dvh">
          <TypographyProvider>
            <InAppAlertListener />
            <FirebaseClientServices enabled />
            <PushDeviceTokenRegistration enabled />
            <div className="px-3 pt-2">
              <PushPermissionRecoveryBanner />
            </div>
            <TransportAlertsSync />
            <Outlet />
          </TypographyProvider>
        </OfflineSyncHost>
        <Toaster position="top-center" richColors />
      </TransportAuthProvider>
    </QueryClientProvider>
  );
}

function ThemeSync() {
  const { theme } = useSettings();

  useEffect(() => {
    applyThemeMode(theme);
  }, [theme]);

  return null;
}
