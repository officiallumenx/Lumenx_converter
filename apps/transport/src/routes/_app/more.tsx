import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";

import { MoreBackButton } from "@/components/app/more-back-button";
import { getPageTitle, ROUTES } from "@/constants";

export const Route = createFileRoute("/_app/more")({
  component: MoreLayout,
});

function MoreLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHub = pathname === ROUTES.more || pathname === `${ROUTES.more}/`;

  return (
    <div className="min-w-0">
      {!isHub ? (
        <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border/80 bg-background/95 px-4 py-2.5 backdrop-blur-md sm:-mx-5 sm:px-5">
          <MoreBackButton />
          <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-foreground">
            {getPageTitle(pathname)}
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {pathname.includes("bus-information")
              ? "Assigned vehicle and route details"
              : pathname.includes("route-setup")
                ? "Capture stops by driving the route once"
                : pathname.includes("profile")
                  ? "Driver account details"
                  : pathname.includes("settings")
                    ? "Theme and notification preferences"
                    : pathname.includes("support")
                      ? "Help, contacts, and policy information"
                      : null}
          </p>
        </div>
      ) : null}
      <Outlet />
    </div>
  );
}
