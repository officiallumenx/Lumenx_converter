import { createFileRoute } from "@tanstack/react-router";
import { ActivityCertificatesPage } from "@/activity-workspace";

export const Route = createFileRoute("/activity/certificates")({
  head: () => ({ meta: [{ title: "Certificates — Activity Portal" }] }),
  component: ActivityCertificatesPage,
});
