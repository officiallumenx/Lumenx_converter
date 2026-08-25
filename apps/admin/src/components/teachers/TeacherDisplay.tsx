import type { ReactNode } from "react";
import { Pill } from "@lumenx/ui-admin";
import type { TeacherRecord, TeacherRole, TeacherStatus } from "@lumenx/types";

export type { TeacherRole, TeacherStatus };
export type Teacher = TeacherRecord;

export const TEACHER_ROLES: Array<{ value: TeacherRole; label: string }> = [
  { value: "subject-teacher", label: "Subject Teacher" },
  { value: "activity-coordinator", label: "Activity Coordinator" },
  { value: "both", label: "Both Roles" },
];

export function teacherInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

export function teacherRoleLabel(role: TeacherRole): string {
  return TEACHER_ROLES.find((option) => option.value === role)?.label ?? role;
}

export function TeacherStatusPill({ status }: { status: TeacherStatus }) {
  if (status === "active") return <Pill tone="success">Active</Pill>;
  if (status === "on-leave") return <Pill tone="warning">On leave</Pill>;
  return <Pill tone="info">Pending</Pill>;
}

export function TeacherRolePill({ role }: { role: TeacherRole }) {
  return (
    <Pill
      tone={
        role === "both" ? "success" : role === "activity-coordinator" ? "warning" : "info"
      }
    >
      {teacherRoleLabel(role)}
    </Pill>
  );
}

export function TeacherAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "size-16 text-sm" : "size-11 text-xs";
  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-primary/30 to-chart-5/30 ring-2 ring-border flex items-center justify-center font-semibold`}
    >
      {teacherInitials(name)}
    </div>
  );
}

export function TeacherDetailRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className="flex items-center gap-2 text-xs text-foreground">
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        <span>{value}</span>
      </div>
    </div>
  );
}

export function TeacherStatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-md border border-border bg-background/40">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-medium mt-1 text-sm">{value}</div>
    </div>
  );
}

export function TeacherChip({
  children,
  mono = false,
}: {
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <span
      className={
        mono
          ? "px-2 py-1 rounded text-[11px] font-mono bg-background border border-border"
          : "px-2 py-1 rounded text-[11px] bg-accent border border-border"
      }
    >
      {children}
    </span>
  );
}
