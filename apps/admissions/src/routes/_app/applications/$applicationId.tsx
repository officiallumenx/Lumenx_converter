import { createFileRoute } from "@tanstack/react-router";
import { RequireParentAuth } from "@/admissions-portal/core/guards";
import { ApplicationStatusPage } from "@/admissions-portal/features/applications/ApplicationsPages";

export const Route = createFileRoute("/_app/applications/$applicationId")({
  head: ({ params }) => ({ meta: [{ title: `${params.applicationId} — Application Status` }] }),
  component: StatusRoute,
});

function StatusRoute() {
  const { applicationId } = Route.useParams();
  return (
    <RequireParentAuth>
      <ApplicationStatusPage applicationId={applicationId} />
    </RequireParentAuth>
  );
}
