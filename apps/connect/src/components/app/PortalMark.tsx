import type { Role } from "@lumenx/types";
import { cn } from "@lumenx/ui";

export const PORTAL_LETTER: Record<Role, string> = {
  parent: "P",
  teacher: "T",
  student: "S",
};

export const PORTAL_LABEL: Record<Role, string> = {
  parent: "Parent Portal",
  teacher: "Teacher Portal",
  student: "Student Portal",
};

const PORTAL_TONE: Record<Role, string> = {
  parent: "bg-gradient-primary text-primary-foreground shadow-glow",
  teacher: "bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-glow",
  student: "bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-glow",
};

/** Letter badge identifying P / T / S portal — header & sidebar. */
export function PortalMark({
  role,
  size = "md",
  className,
}: {
  role: Role;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dim =
    size === "sm" ? "size-8 text-sm" : size === "lg" ? "size-12 text-xl" : "size-9 text-base";
  return (
    <div
      className={cn(
        "rounded-xl grid place-items-center font-display font-bold shrink-0",
        dim,
        PORTAL_TONE[role],
        className,
      )}
      aria-label={PORTAL_LABEL[role]}
      title={PORTAL_LABEL[role]}
    >
      {PORTAL_LETTER[role]}
    </div>
  );
}
