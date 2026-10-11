import { Navigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { Role } from "@lumenx/types";
import { useApp } from "@/lib/app-state";
import {
  CONNECT_ROLE_DENIED_REDIRECT,
  getConnectRoleGateDecision,
} from "@/lib/role-route-access";

/**
 * Redirects unauthorized roles away from feature routes.
 * Shows nothing while auth/role hydrate to avoid incorrect redirects.
 */
export function ConnectRoleGate({
  allow,
  children,
}: {
  allow: readonly Role[];
  children: ReactNode;
}) {
  const { role, hydrated } = useApp();
  const decision = getConnectRoleGateDecision(hydrated, role, allow);

  if (decision === "loading") {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (decision === "deny") {
    return <Navigate to={CONNECT_ROLE_DENIED_REDIRECT} replace />;
  }

  return children;
}
