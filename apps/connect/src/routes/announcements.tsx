import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AnnouncementsCenterView } from "@/components/app/announcements/AnnouncementsCenterView";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useConnectAnnouncementsList } from "@/hooks/use-connect-announcements";
import type { ConnectAnnouncementPortalRole } from "@/lib/announcements/demo-load";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AnnouncementsRoutePage />
    </AppShell>
  ),
});

function AnnouncementsRoutePage() {
  const { role, activeInstituteId } = useApp();
  const portal = useParentPortal();

  if (role !== "parent" && role !== "student" && role !== "teacher") {
    return (
      <AnnouncementsCenterView
        items={[]}
        subtitle="Announcements are available for students, parents, and teachers."
      />
    );
  }

  const portalRole = role as ConnectAnnouncementPortalRole;
  const { items, loading, error } = useConnectAnnouncementsList(
    activeInstituteId,
    portalRole,
  );

  const subtitle =
    role === "parent" && portal.isParent && portal.snapshot
      ? `For ${portal.snapshot.shortName} · ${items.length} published`
      : `${items.length} published`;

  return (
    <AnnouncementsCenterView
      items={items}
      loading={loading}
      error={error}
      subtitle={subtitle}
    />
  );
}
