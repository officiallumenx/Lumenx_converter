import { useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/admin-api";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";

type LocationChangeDto = {
  id: string;
  enrollmentId: string;
  studentId: string;
  routeId: string;
  previousPickupStopId: string | null;
  previousDropStopId: string | null;
  newStopId: string;
  changedByDriverId: string | null;
  effectiveMode: string;
  createdAt: string;
};

async function listLocationChanges(
  instituteId: string,
): Promise<LocationChangeDto[]> {
  if (!isApiAuthMode()) return [];
  if (!isInstituteUuid(instituteId)) return [];
  const query = new URLSearchParams();
  query.set("institute_id", instituteId.trim());
  query.set("limit", "50");
  return getAdminApiClient().get<LocationChangeDto[]>(
    `/api/v1/transport/enrollment-location-changes?${query.toString()}`,
  );
}

export function TransportLocationChangesPanel({
  instituteId,
}: {
  instituteId: string;
}) {
  const query = useQuery({
    queryKey: adminQueryKeys.transport(instituteId, "location-changes"),
    queryFn: () => listLocationChanges(instituteId),
    enabled: Boolean(instituteId),
  });

  const rows = query.data ?? [];

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          Driver location changes
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Ordinary student location moves do not need approval. They apply from the
          next trip when a trip is already running.
        </p>
      </div>
      {query.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent location changes.</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {rows.map((row) => (
            <li key={row.id} className="space-y-1 px-3 py-2.5 text-sm">
              <p className="font-medium text-foreground">
                Student {row.studentId.slice(0, 8)}…
              </p>
              <p className="text-xs text-muted-foreground">
                Previous: {row.previousPickupStopId?.slice(0, 8) ?? "—"} → New:{" "}
                {row.newStopId.slice(0, 8)}…
              </p>
              <p className="text-xs text-muted-foreground">
                {row.effectiveMode === "next_trip"
                  ? "Effective: next trip"
                  : "Effective: immediate"}{" "}
                · {new Date(row.createdAt).toLocaleString()}
                {row.changedByDriverId
                  ? ` · Driver ${row.changedByDriverId.slice(0, 8)}…`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
