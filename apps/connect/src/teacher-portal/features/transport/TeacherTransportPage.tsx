import { useEffect } from "react";
import { Bus, Users } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { PageHeader } from "@/components/app/PageHeader";
import { StatCard } from "@/components/app/StatCard";
import { useTeacherPortal } from "@/context/TeacherPortalContext";
import { useApp } from "@/lib/app-state";
import { useTeacherTransportQuery } from "@/lib/connect-queries/hooks";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { PageSkeleton } from "@/teacher-portal/shared/ui/PageSkeleton";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";

/** Teacher transport — API roster only. No demo store / fake GPS. */
export function TeacherTransportPage() {
  const portal = useTeacherPortal();
  const { activeInstituteId } = useApp();
  const hasTransport = portal.isTeacher && portal.profile?.hasTransport === true;

  const {
    data: transportData,
    isLoading: transportLoading,
    refresh: refreshTransport,
  } = useTeacherTransportQuery(
    activeInstituteId,
    hasTransport && Boolean(activeInstituteId),
  );

  const apiRoster =
    transportData?.status === "ready" ? transportData.rows : [];
  const apiRosterLoading = transportLoading && !transportData;

  useEffect(() => {
    if (!activeInstituteId) return;
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId: activeInstituteId,
        onChange: refreshTransport,
      });
    } catch {
      return undefined;
    }
  }, [activeInstituteId, refreshTransport]);

  if (!portal.isTeacher) return null;
  if (portal.isLoading && !portal.profile) return <PageSkeleton rows={6} />;
  if (!portal.profile) {
    return (
      <p className="text-sm text-muted-foreground">Transport unavailable — teacher profile not loaded.</p>
    );
  }

  if (!hasTransport) {
    return (
      <div className="min-w-0 max-w-full space-y-5">
        <PageHeader
          title="Transport"
          subtitle="School bus routes and pickup tracking"
        />
        <EmptyState
          icon={Bus}
          title="No transport for you"
          description="Your school has not enabled transport access on your account, or this institute does not run a bus service for staff. Contact the admin office if you believe this is a mistake."
        />
      </div>
    );
  }

  const assignedCount = apiRoster.filter((r) => r.busNumber).length;
  return (
    <div className="min-w-0 max-w-full space-y-5">
      <PageHeader
        title="Transport management"
        subtitle="Bus assignments for students in your classes"
      />

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Users}
          label="Students listed"
          value={String(apiRoster.length)}
          hint="From institute enrollments"
          tone="primary"
        />
        <StatCard
          icon={Bus}
          label="With bus assigned"
          value={String(assignedCount)}
          hint="Active route enrollments"
          tone="success"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Class bus assignments</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Enrollments from the institute transport API. Live ETA is on the parent/student transport view.
        </p>
        {apiRosterLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading roster…</p>
        ) : apiRoster.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No bus assignments found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Student</th>
                  <th className="py-2 pr-4 font-medium">Class</th>
                  <th className="py-2 pr-4 font-medium">Roll</th>
                  <th className="py-2 pr-4 font-medium">Route</th>
                  <th className="py-2 font-medium">Bus</th>
                </tr>
              </thead>
              <tbody>
                {apiRoster.map((row) => (
                  <tr key={row.studentId} className="border-b border-border/60">
                    <td className="py-2 pr-4">{row.studentName}</td>
                    <td className="py-2 pr-4">
                      {row.classLabel}
                      {row.sectionLabel !== "—" ? ` · ${row.sectionLabel}` : ""}
                    </td>
                    <td className="py-2 pr-4">{row.rollNo}</td>
                    <td className="py-2 pr-4">{row.routeName ?? "—"}</td>
                    <td className="py-2">{row.busNumber ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
