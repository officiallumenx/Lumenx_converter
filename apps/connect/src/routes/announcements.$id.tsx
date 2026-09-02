import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { AnnouncementDetailView } from "@/components/app/announcements/AnnouncementsCenterView";
import { useApp } from "@/lib/app-state";
import { useConnectAnnouncementDetail } from "@/hooks/use-connect-announcements";
import type { ConnectAnnouncementPortalRole } from "@/lib/announcements/demo-load";

export const Route = createFileRoute("/announcements/$id")({
  head: () => ({ meta: [{ title: "Announcement — LumenX Connect" }] }),
  component: () => (
    <AppShell>
      <AnnouncementDetailRoutePage />
    </AppShell>
  ),
});

function AnnouncementDetailRoutePage() {
  const { id } = Route.useParams();
  const { role, activeInstituteId } = useApp();

  if (role !== "parent" && role !== "student" && role !== "teacher") {
    return <AnnouncementDetailView row={null} error="Announcements are not available for this role." />;
  }

  const portalRole = role as ConnectAnnouncementPortalRole;
  const { item, loading, error } = useConnectAnnouncementDetail(
    id,
    activeInstituteId,
    portalRole,
  );

  return <AnnouncementDetailView row={item} loading={loading} error={error} />;
}
