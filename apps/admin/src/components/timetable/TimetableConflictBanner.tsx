import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type TimetableConflictBannerProps = {
  role?: "status" | "alert";
  children: ReactNode;
};

export function TimetableConflictBanner({
  role = "status",
  children,
}: TimetableConflictBannerProps) {
  return (
    <div className="lx-timetable-conflict-banner" role={role}>
      <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}
