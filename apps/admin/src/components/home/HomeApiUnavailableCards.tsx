import type { ReactNode } from "react";
import { Card, EmptyState } from "@lumenx/ui-admin";
import { Bus, ClipboardList } from "lucide-react";

/** Explicitly gated widgets — product/backend data not safely available. */
export function HomeApiUnavailableCard({
  title,
  reason,
  icon,
}: {
  title: string;
  reason: string;
  icon?: ReactNode;
}) {
  return (
    <Card>
      <EmptyState
        icon={icon ?? <ClipboardList className="size-5" />}
        title={title}
        hint={reason}
      />
    </Card>
  );
}

export function HomeTransportSosApiUnavailableCard() {
  return (
    <HomeApiUnavailableCard
      title="Transport emergencies"
      reason="Active SOS / emergency count has no institute-scoped admin read API. Demo transport SOS is not shown in API mode."
      icon={<Bus className="size-5" />}
    />
  );
}

export function HomeAttendanceMissingSectionsUnavailableCard() {
  return (
    <HomeApiUnavailableCard
      title="Sections with no attendance started"
      reason="Cannot list expected section/slot matrix vs missing registers without inventing attendance expectations. Draft registers for today are shown separately when available."
    />
  );
}
