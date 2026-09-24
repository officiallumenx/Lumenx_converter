import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementsCenterView } from "@/components/app/announcements/AnnouncementsCenterView";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useConnectAnnouncementsList } from "@/hooks/use-connect-announcements";
import type { ConnectAnnouncementPortalRole } from "@/lib/announcements/demo-load";

export const Route = createFileRoute("/_authenticated/announcements")({
  head: () => ({ meta: [{ title: "Announcements — LumenX Connect" }] }),
  component: () => (
    <AnnouncementsRoutePage />
  ),
});

function AnnouncementsRoutePage() {
  const { role, activeInstituteId } = useApp();
  const portal = useParentPortal();
  const allowed = role === "parent" || role === "student" || role === "teacher";
  const portalRole = (allowed ? role : "student") as ConnectAnnouncementPortalRole;
  const { items, loading, error } = useConnectAnnouncementsList(
    allowed ? activeInstituteId : null,
    portalRole,
  );

  if (!allowed) {
    return (
      <AnnouncementsCenterView
        items={[]}
        subtitle="Announcements are available for students, parents, and teachers."
      />
    );
  }

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
