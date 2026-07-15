import { Link } from "@tanstack/react-router";
import { Sparkles, Settings } from "lucide-react";
import { cn } from "@lumenx/ui";
import { useTeacherPortalAccess } from "@/lib/teacher-session";

/** Shows which teacher workspace is active — avoids confusion for dual-role teachers. */
export function ActivityWorkspaceContextBar() {
  const access = useTeacherPortalAccess();

  if (!access.isTeacher || !access.isReady || !access.isActivityWorkspaceActive) {
    return null;
  }

  const isDual = access.assignmentType === "dual_role";

  return (
    <div
      className={cn(
        "sticky top-14 z-30 border-b border-primary/20 bg-primary/5 px-3 py-2.5 md:top-16 md:px-8",
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden />
          Activity Coordinator workspace
        </span>
        {isDual ? (
          <>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              Subject modules are hidden here. Switch back in{" "}
              <Link to="/profile" className="font-medium text-primary underline-offset-2 hover:underline">
                Settings
              </Link>
              .
            </span>
          </>
        ) : (
          <span className="text-muted-foreground">
            Academic teacher modules are not available for your role.
          </span>
        )}
        {isDual ? (
          <Link
            to="/profile"
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Settings className="size-3.5" aria-hidden />
            Switch role
          </Link>
        ) : null}
      </div>
    </div>
  );
}
