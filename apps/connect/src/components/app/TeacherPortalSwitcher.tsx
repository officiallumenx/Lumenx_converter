import { useNavigate } from "@tanstack/react-router";
import { BookOpen, Trophy } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { TeacherActivePortal } from "@lumenx/teacher-session";
import { ACTIVITY_WORKSPACE_BASE } from "@/activity-workspace/core/routes";
import { useTeacherPortalAccess } from "@/lib/teacher-session";

type TeacherPortalSwitcherProps = {
  variant?: "header" | "settings";
  className?: string;
};

export function TeacherPortalSwitcher({ variant = "settings", className }: TeacherPortalSwitcherProps) {
  const access = useTeacherPortalAccess();
  const nav = useNavigate();

  if (
    !access.isTeacher ||
    !access.isReady ||
    access.assignmentType !== "dual_role" ||
    !access.canAccessActivityWorkspace ||
    !access.canAccessSubjectWorkspace
  ) {
    return null;
  }

  const switchPortal = (portal: TeacherActivePortal) => {
    if (access.activePortal === portal) return;
    access.setActivePortal(portal);
    queueMicrotask(() => {
      nav({ to: portal === "activity" ? ACTIVITY_WORKSPACE_BASE : "/" });
    });
  };

  if (variant === "header") {
    return (
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5",
          className,
        )}
        role="group"
        aria-label="Switch teacher portal"
      >
        <PortalPill
          active={access.isSubjectPortalActive}
          label="Subject"
          onClick={() => switchPortal("subject")}
          compact
        />
        <PortalPill
          active={access.isActivityWorkspaceActive}
          label="Activity"
          onClick={() => switchPortal("activity")}
          compact
        />
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <PortalCard
        active={access.isSubjectPortalActive}
        title="Subject Teacher"
        description="Classes, attendance, marks, homework, and parent messaging."
        icon={BookOpen}
        onClick={() => switchPortal("subject")}
      />
      <PortalCard
        active={access.isActivityWorkspaceActive}
        title="Activity Coordinator"
        description="Sports, extra-curricular, calendar, and shared communication."
        icon={Trophy}
        onClick={() => switchPortal("activity")}
      />
    </div>
  );
}

function PortalPill({
  active,
  label,
  onClick,
  compact,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full font-medium transition-colors touch-manipulation",
        compact ? "px-2.5 py-1 text-[10px] sm:px-3 sm:text-xs" : "px-4 py-2 text-sm",
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function PortalCard({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: typeof BookOpen;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "settings-portal-card text-left",
        active ? "is-active" : "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-xl",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</div>
          {active ? (
            <div className="settings-section-label mt-2 text-primary normal-case tracking-normal">
              Active now
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}
