import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import logoUrl from "../assets/lumenx-logo.png?url";
import { Toaster } from "@lumenx/ui/sonner";
import { LumenXNativeShell } from "@lumenx/capacitor/native-shell";

const ConnectPortalProviders = lazy(() =>
  import("@/components/app/ConnectPortalProviders").then((m) => ({
    default: m.ConnectPortalProviders,
  })),
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  const isDev = import.meta.env.DEV;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        {isDev ? (
          <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-left text-[11px] text-destructive whitespace-pre-wrap">
            {error.message}
          </pre>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
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
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "LumenX Connect — Education Ecosystem for Parents, Teachers & Students" },
      {
        name: "description",
        content:
          "A premium real-time education platform connecting parents, teachers and students with awareness, communication and improvement at its core.",
      },
      { property: "og:title", content: "LumenX Connect — Education Ecosystem" },
      {
        property: "og:description",
        content: "Premium real-time education platform for parents, teachers and students.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "icon", href: logoUrl, type: "image/png" },
      {
        rel: "stylesheet",
        href: appCss,
      },
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

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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

function ConnectProvidersFallback() {
  return <div className="min-h-screen bg-background" aria-hidden />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const isolated = useRouterState({
    select: (s) =>
      s.location.pathname.startsWith("/careers") || s.location.pathname.startsWith("/admissions"),
  });

  return (
    <QueryClientProvider client={queryClient}>
      <LumenXNativeShell />
      {isolated ? (
        <Outlet />
      ) : (
        <Suspense fallback={<ConnectProvidersFallback />}>
          <ConnectPortalProviders>
            <Outlet />
          </ConnectPortalProviders>
        </Suspense>
      )}
      <Toaster
        position="top-center"
        richColors
        offset="calc(max(env(safe-area-inset-top, 0px), var(--safe-area-inset-top-measured, 0px), var(--safe-area-top-fallback, 0px)) + 1rem)"
      />
    </QueryClientProvider>
  );
}
