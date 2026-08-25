import type { ReactNode } from "react";
import {
  AlertTriangle,
  Bus,
  Loader2,
  Route,
  UserX,
  Users,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ROUTES } from "@/constants";
import type { DriverAssignment } from "@/lib/transport/driver-assignment";

type Props = {
  assignment: DriverAssignment;
  children: ReactNode;
  /** When true, still render children if ready but no students (show banner instead). */
  allowEmptyStudents?: boolean;
};

/**
 * Gates primary Transport screens on driver assignment status.
 * Preserves existing layout; only blocks when assignment is incomplete.
 */
export function DriverAssignmentGate({
  assignment,
  children,
  allowEmptyStudents = true,
}: Props) {
  const navigate = useNavigate();

  if (assignment.status === "loading") {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-transport" aria-hidden />
        <p className="text-sm text-muted-foreground">Loading your assignment…</p>
      </div>
    );
  }

  if (assignment.status === "no_session") {
    return (
      <EmptyState
        icon={UserX}
        title="Not signed in"
        description={assignment.message ?? "Sign in to see your bus assignment."}
        action={
          <Button type="button" variant="transport" onClick={() => void navigate({ to: ROUTES.login })}>
            Sign in
          </Button>
        }
      />
    );
  }

  if (assignment.status === "not_found") {
    return (
      <EmptyState
        icon={UserX}
        title="Account not found"
        description={assignment.message ?? "Ask Admin to create your Transport account."}
      />
    );
  }

  if (assignment.status === "inactive") {
    return (
      <EmptyState
        icon={UserX}
        title="Driver inactive"
        description={assignment.message ?? "Your Transport account is inactive. Contact Admin."}
      />
    );
  }

  if (assignment.status === "no_bus") {
    return (
      <EmptyState
        icon={Bus}
        title="No bus assigned"
        description={assignment.message ?? "Ask Admin to assign a vehicle to your account."}
      />
    );
  }

  if (assignment.status === "no_route") {
    return (
      <EmptyState
        icon={Route}
        title="No route assigned"
        description={assignment.message ?? "Ask Admin to assign a route to your bus."}
      />
    );
  }

  if (!allowEmptyStudents && assignment.status === "ready" && assignment.studentCount === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No students assigned"
        description={
          assignment.message ??
          "Ask Admin to enroll students on your bus before marking attendance."
        }
      />
    );
  }

  if (assignment.status === "ready" && assignment.studentCount === 0 && assignment.message) {
    return (
      <div className="space-y-4">
        <EmptyState
          icon={AlertTriangle}
          title="No students assigned"
          description={assignment.message}
          compact
          className="border-amber-500/30 bg-amber-500/5"
        />
        {children}
      </div>
    );
  }

  if (assignment.status !== "ready") {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Assignment unavailable"
        description={assignment.message ?? "Could not load your bus assignment."}
      />
    );
  }

  return <>{children}</>;
}
