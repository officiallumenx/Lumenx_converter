import { createFileRoute } from "@tanstack/react-router";
import { InstituteProfilePage } from "@/admissions-portal/features/institutes/InstituteProfilePage";

export const Route = createFileRoute("/_app/institutes/$instituteId")({
  head: ({ params }) => ({ meta: [{ title: `${params.instituteId} — Institute` }] }),
  component: InstituteDetailRoute,
});

function InstituteDetailRoute() {
  const { instituteId } = Route.useParams();
  return <InstituteProfilePage instituteId={instituteId} />;
}
