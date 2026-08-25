import { createFileRoute } from "@tanstack/react-router";

import { DriverAssignmentGate } from "@/components/app/driver-assignment-state";
import { APP_NAME } from "@/constants";
import { EmergencyPage } from "@/features/emergency";

export const Route = createFileRoute("/_app/emergency")({
  head: () => ({ meta: [{ title: `Emergency — ${APP_NAME}` }] }),
  validateSearch: (search: Record<string, unknown>): { confirm?: boolean } => {
    if (search.confirm === true || search.confirm === "1" || search.confirm === "true") {
      return { confirm: true };
    }
    return {};
  },
  component: EmergencyRoute,
});

function EmergencyRoute() {
  const { confirm } = Route.useSearch();
  return (
    <DriverAssignmentGate allowEmptyStudents>
      <EmergencyPage autoConfirm={Boolean(confirm)} />
    </DriverAssignmentGate>
  );
}
