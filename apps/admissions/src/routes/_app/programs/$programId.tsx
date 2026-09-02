import { createFileRoute } from "@tanstack/react-router";
import { ProgramDetailPage } from "@/admissions-portal/features/programs/ProgramDetailPage";

export const Route = createFileRoute("/_app/programs/$programId")({
  head: ({ params }) => ({ meta: [{ title: `${params.programId} — Program` }] }),
  component: ProgramRoute,
});

function ProgramRoute() {
  const { programId } = Route.useParams();
  return <ProgramDetailPage programId={programId} />;
}
