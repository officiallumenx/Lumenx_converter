import { createFileRoute } from "@tanstack/react-router";
import { AnnouncementDetailView } from "@/components/app/announcements/AnnouncementsCenterView";
import { useApp } from "@/lib/app-state";
import { useConnectAnnouncementDetail } from "@/hooks/use-connect-announcements";
import type { ConnectAnnouncementPortalRole } from "@/lib/announcements/demo-load";

export const Route = createFileRoute("/_authenticated/announcements/$id")({
  head: () => ({ meta: [{ title: "Announcement — LumenX Connect" }] }),
  component: () => (
    <AnnouncementDetailRoutePage />
  ),
});

function AnnouncementDetailRoutePage() {
  const { id } = Route.useParams();
  const { role, activeInstituteId } = useApp();
  const allowed = role === "parent" || role === "student" || role === "teacher";
  const portalRole = (allowed ? role : "student") as ConnectAnnouncementPortalRole;
  const { item, loading, error } = useConnectAnnouncementDetail(
    allowed ? id : "",
    allowed ? activeInstituteId : null,
    portalRole,
  );

  if (!allowed) {
    return <AnnouncementDetailView row={null} error="Announcements are not available for this role." />;
  }

  return <AnnouncementDetailView row={item} loading={loading} error={error} />;
}
