import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { Button, cn } from "@lumenx/ui";
import { useTeacherPortalAccess } from "@/lib/teacher-session";

const DISMISS_KEY = "lumenx_activity_workspace_banner_dismissed";

function readDismissed() {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/** Shows which teacher workspace is active — dismissible after login. */
export function ActivityWorkspaceContextBar() {
  const access = useTeacherPortalAccess();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (!access.isTeacher || !access.isReady || !access.isActivityWorkspaceActive || dismissed) {
    return null;
  }

  const isDual = access.assignmentType === "dual_role";

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        "sticky top-14 z-30 border-b border-primary/20 bg-primary/5 px-3 py-2.5 md:top-16 md:px-8",
      )}
      role="status"
    >
      <div className="mx-auto flex max-w-6xl min-w-0 items-start gap-2 text-sm sm:items-center">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
            Activity Coordinator workspace
          </span>
          {isDual ? (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Subject modules are hidden here. Switch role in Settings when needed.
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">
              Academic teacher modules are not available for your role.
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
