import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SetupChecklistPanel } from "@/components/setup/SetupChecklistPanel";
import { useSetupChecklist } from "@/lib/institute-setup-checklist";
import { adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: adminPageTitle("/setup") }] }),
  component: SetupPage,
});

function SetupPage() {
  const { state, reload } = useSetupChecklist();

  // Soft recount on visit — keep last checklist on screen; do not force-poison.
  useEffect(() => {
    void reload({ force: false });
  }, [reload]);

  return (
    <AppShell
      title="Setup"
      subtitle="Finish institute setup so Admin, Connect, and Transport share live data"
    >
      <SetupChecklistPanel state={state} onRefresh={() => void reload({ force: true })} />
    </AppShell>
  );
}
