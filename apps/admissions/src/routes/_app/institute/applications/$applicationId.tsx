import { createFileRoute } from "@tanstack/react-router";
import { InstituteApplicationReviewPage } from "@/admissions-portal/features/institute-admin/InstituteAdminPages";

export const Route = createFileRoute("/_app/institute/applications/$applicationId")({
  head: ({ params }) => ({ meta: [{ title: `${params.applicationId} — Review` }] }),
  component: ReviewRoute,
});

function ReviewRoute() {
  const { applicationId } = Route.useParams();
  return <InstituteApplicationReviewPage applicationId={applicationId} />;
}
