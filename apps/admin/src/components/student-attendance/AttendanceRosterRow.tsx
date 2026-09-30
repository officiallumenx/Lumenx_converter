import { CalendarOff, Check, UserX } from "lucide-react";
import { Avatar, AvatarFallback, cn } from "@lumenx/ui";

function avatarInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Connect-parity roster row: tap toggles present ↔ absent; leave is locked. */
export function AttendanceRosterRow({
  name,
  roll,
  isAbsent,
  isOnLeave,
  disabled,
  onToggle,
}: {
  name: string;
  roll: string;
  isAbsent: boolean;
  isOnLeave?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  const initials = avatarInitials(name);

  if (isOnLeave) {
    return (
      <div
        className="flex min-w-0 w-full items-center gap-2 bg-warning/5 px-3 py-3 sm:gap-3 sm:px-5"
        aria-label={`${name}, roll ${roll}, on approved leave`}
      >
        <div className="w-7 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
          {roll || "—"}
        </div>
        <Avatar className="size-10 shrink-0">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{name}</div>
          <div className="text-xs font-medium text-warning-foreground">Approved leave</div>
        </div>
        <div className="size-10 shrink-0 rounded-full grid place-items-center bg-warning/15 text-warning-foreground">
          <CalendarOff className="size-4" />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex min-w-0 w-full items-center gap-2 px-3 py-3 text-left transition-colors sm:gap-3 sm:px-5",
        disabled && "cursor-not-allowed opacity-60",
        isAbsent ? "bg-destructive/5" : !disabled && "hover:bg-muted/40 active:bg-muted/60",
      )}
      aria-pressed={isAbsent}
      aria-disabled={disabled || undefined}
      aria-label={`${name}, roll ${roll}, ${isAbsent ? "absent" : "present"}`}
    >
      <div className="w-7 shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
        {roll || "—"}
      </div>
      <Avatar className="size-10 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 truncate font-medium">{name}</div>
      <div
        className={cn(
          "size-10 shrink-0 rounded-full grid place-items-center transition-all duration-200",
          isAbsent
            ? "bg-destructive text-destructive-foreground scale-100"
            : "bg-success/15 text-success",
        )}
      >
        {isAbsent ? <UserX className="size-4" /> : <Check className="size-4" />}
      </div>
    </button>
  );
}
