import { useMemo, useSyncExternalStore } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { Badge, cn } from "@lumenx/ui";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import type { WorkspaceCommunicationKind } from "@/lib/activity/workspace-communication";
import { ActivityEmptyState } from "../../shared/ui";

const KIND_LABEL: Record<WorkspaceCommunicationKind, string> = {
  message: "Message",
  notification: "Notification",
  announcement: "Announcement",
};

/** Shared list view for communication kinds — prefer feature pages for UX. */
export function WorkspaceCommunicationPage({
  kind,
  title,
  subtitle,
  embedded,
}: {
  kind: WorkspaceCommunicationKind;
  title: string;
  subtitle: string;
  embedded?: boolean;
}) {
  const all = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  const items = useMemo(() => all.filter((i) => i.kind === kind), [all, kind]);

  return (
    <div className="min-w-0 space-y-5">
      {embedded ? null : <PageHeader title={title} subtitle={subtitle} />}
      <ul className="space-y-2">
        {items.length ? (
          items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "activity-list-row rounded-2xl border border-border bg-card p-4 shadow-soft",
                item.unread && "border-primary/30 bg-primary/5",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {KIND_LABEL[item.kind]}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {item.audienceLabel} · {new Date(item.sentAt).toLocaleString("en-IN")}
              </p>
            </li>
          ))
        ) : (
          <li>
            <ActivityEmptyState
              title={`No ${KIND_LABEL[kind].toLowerCase()}s yet`}
              description="When something is recorded for Activity Coordinator, it will show here."
              className="py-6"
            />
          </li>
        )}
      </ul>
    </div>
  );
}
