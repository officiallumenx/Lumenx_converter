import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  EmptyState,
  Pill,
} from "@lumenx/ui-admin";
import { KeyRound, ShieldCheck, Users } from "lucide-react";
import { useInstituteContext } from "@/lib/institutes";
import { listAccessAssignees, type AccessAssigneeDto } from "@/lib/access-roles";

export function AccountsApiStaffPanel() {
  const instituteCtx = useInstituteContext();
  const instituteId = instituteCtx.activeInstituteId;
  const [assignees, setAssignees] = useState<AccessAssigneeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!instituteId || instituteCtx.status === "loading") {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listAccessAssignees(instituteId)
      .then((rows) => {
        if (!cancelled) setAssignees(rows);
      })
      .catch((reason) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Failed to load staff accounts");
          setAssignees([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId, instituteCtx.status]);

  const activeCount = assignees.filter((a) => a.membershipStatus === "active").length;
  const suspendedCount = assignees.filter((a) => a.membershipStatus === "suspended").length;

  if (!instituteId) {
    return (
      <EmptyState
        icon={<Users className="size-5" />}
        title="Select an institute"
        hint="Choose an institute to view staff Admin accounts."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="lx-kpi-grid">
        {[
          { label: "Staff accounts", value: assignees.length },
          { label: "Active", value: activeCount },
          { label: "Suspended", value: suspendedCount },
        ].map((item) => (
          <Card key={item.label}>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              {item.label}
            </div>
            <div className="lx-kpi-stat__value tracking-tight">{item.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Staff Admin accounts"
          hint="Teachers and staff with Roles & Access login · OTP + password every session"
          action={
            <Link to="/permissions" className="text-xs font-medium text-primary hover:underline">
              Manage in Roles & Access
            </Link>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left">
            <thead>
              <tr className="border-b border-border bg-background/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">User</th>
                <th className="px-4 py-3">Login identity</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignees.map((assignee) => (
                <tr key={assignee.id} className="hover:bg-surface-hover">
                  <td className="px-5 py-3">
                    <div className="text-xs font-medium">{assignee.displayName}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {assignee.linkedPersonType === "teacher"
                        ? "Teacher"
                        : assignee.linkedPersonType === "staff"
                          ? "Staff"
                          : "Unlinked"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {assignee.email && <div>{assignee.email}</div>}
                    {assignee.phone && (
                      <div className="text-muted-foreground">{assignee.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div>{assignee.accessRoleName}</div>
                    {assignee.assignedSectionKeys.length > 0 ? (
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {assignee.assignedSectionKeys.length} class · section
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Pill
                      tone={
                        assignee.membershipStatus === "active"
                          ? "success"
                          : assignee.membershipStatus === "suspended"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {assignee.membershipStatus}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && assignees.length === 0 && !error && (
            <div className="px-5 py-10 text-center">
              <ShieldCheck className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No staff Admin accounts yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assign teachers or staff under Roles & Access to enable Admin login.
              </p>
              <Link
                to="/permissions"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-surface-hover"
              >
                <KeyRound className="size-3.5" /> Open Roles & Access
              </Link>
            </div>
          )}
          {error && (
            <div className="px-5 py-6 text-center text-xs text-destructive">{error}</div>
          )}
        </div>
      </Card>
    </div>
  );
}
