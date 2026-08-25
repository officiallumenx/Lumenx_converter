import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { HierarchyDomainSelect } from "@/activity-workspace/shared/components/HierarchyDomainSelect";
import { HierarchyUnitSingleSelect } from "@/activity-workspace/shared/components/HierarchyUnitSelect";
import { useHierarchyUnits } from "@/activity-workspace/shared/hooks/useHierarchyUnits";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import {
  formatUnitLabel,
  unitKindLabel,
  type ActivityDomain,
} from "@/lib/activity/hierarchy";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";

/**
 * Messages — send only.
 * Sports or ECA → Team / Group (hierarchy) → Compose → Send.
 * No chat, replies, or conversations. No separate student picker.
 */
export function ActivityMessagesPage() {
  const [domain, setDomain] = useState<ActivityDomain>("sports");
  const [unitId, setUnitId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { units, loading } = useHierarchyUnits(domain);

  const allItems = useSyncExternalStore(
    workspaceCommunicationRepository.subscribe,
    workspaceCommunicationRepository.getSnapshot,
    workspaceCommunicationRepository.getSnapshot,
  );

  const selected = useMemo(
    () => units.find((u) => u.id === unitId) ?? null,
    [units, unitId],
  );

  const unitWord = selected
    ? unitKindLabel(selected.kind)
    : units[0]
      ? unitKindLabel(units[0].kind)
      : "Team";

  const recentlySent = useMemo(
    () => allItems.filter((i) => i.kind === "message").slice(0, 5),
    [allItems],
  );

  const canSend = Boolean(selected && title.trim() && body.trim() && !sending);

  const send = async () => {
    if (!selected || !title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const label = formatUnitLabel(selected);
      await workspaceCommunicationRepository.sendMessage({
        title: title.trim(),
        body: body.trim(),
        activityType: domain,
        unitLabels: [label],
      });
      toast.success("Message sent", {
        description: `${label} · also noted in Notifications`,
      });
      setTitle("");
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Messages"
        subtitle="Send a message to one Sports team or ECA group."
      />

      <section className="activity-panel space-y-5">
        <div>
          <p className="activity-stat-label mb-2">1 · Sports or ECA</p>
          <HierarchyDomainSelect
            value={domain}
            hideLabel
            onChange={(d) => {
              setDomain(d);
              setUnitId("");
            }}
          />
        </div>

        <div>
          <p className="activity-stat-label mb-2">
            2 · Select {unitWord.toLowerCase()}
          </p>
          <HierarchyUnitSingleSelect
            units={units}
            selectedId={unitId}
            hideLabel
            onChange={setUnitId}
            loading={loading}
          />
          {selected ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Goes to {selected.students.length} student
              {selected.students.length === 1 ? "" : "s"} on this {unitWord.toLowerCase()}{" "}
              roster — no extra student pick needed.
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <p className="activity-stat-label">3 · Compose message</p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Subject
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Practice cancelled"
              className="min-h-11 rounded-xl"
              disabled={!selected}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Message
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message…"
              className="min-h-[120px] rounded-xl"
              disabled={!selected}
            />
          </div>
        </div>

        <Button
          className="activity-primary-action w-full rounded-xl sm:w-auto"
          disabled={!canSend}
          onClick={() => void send()}
        >
          {sending ? "Sending…" : `Send to ${unitWord.toLowerCase()}`}
        </Button>
      </section>

      <section>
        <h2 className="activity-stat-label mb-3">Recently sent</h2>
        {recentlySent.length === 0 ? (
          <ActivityEmptyState
            title="No messages sent yet"
            description="Messages you send to a team or group will show here."
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">
            {recentlySent.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-border bg-card p-3.5 text-sm shadow-soft"
              >
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.body}</p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  {item.audienceLabel} ·{" "}
                  {new Date(item.sentAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ActivityPageShell>
  );
}
