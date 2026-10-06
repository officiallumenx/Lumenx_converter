import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  SearchInput,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { Send } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  emitNotification,
  type BackendNotificationCategory,
  type BackendNotificationPriority,
  type NotificationAudience,
} from "@/lib/notification-inbox";
import {
  listMessageRecipients,
  type MessageRecipientDto,
} from "@/lib/messages";

const CATEGORIES: BackendNotificationCategory[] = [
  "announcements",
  "system",
  "events",
  "attendance",
  "leave",
  "complaints",
  "messages",
];

const PRIORITIES: BackendNotificationPriority[] = [
  "normal",
  "important",
  "critical",
  "success",
];

const AUDIENCES: { value: NotificationAudience | "manual"; label: string }[] = [
  { value: "everyone", label: "Everyone (active members)" },
  { value: "students", label: "Students" },
  { value: "parents", label: "Parents" },
  { value: "teachers", label: "Teachers" },
  { value: "manual", label: "Specific people" },
];

const ROLE_ORDER: Record<MessageRecipientDto["role"], number> = {
  teacher: 0,
  student: 1,
  parent: 2,
  staff: 3,
};

function roleLabel(role: MessageRecipientDto["role"]): string {
  switch (role) {
    case "teacher":
      return "Teacher";
    case "student":
      return "Student";
    case "parent":
      return "Parent";
    case "staff":
      return "Staff";
  }
}

function classSectionLabel(r: MessageRecipientDto): string | null {
  const cls = r.classLabel?.trim();
  const sec = r.sectionLabel?.trim();
  if (!cls && !sec) return null;
  if (cls && sec) return `${cls}-${sec}`;
  return cls || sec || null;
}

function recipientOptionLabel(r: MessageRecipientDto): string {
  const name = r.displayName.trim() || "Unnamed";
  const role = roleLabel(r.role);
  const cs = classSectionLabel(r);
  if (r.role === "student" && cs) return `${name} · ${role} · ${cs}`;
  return `${name} · ${role}`;
}

/** API-mode send — role audience or specific people by name. */
export function NotificationApiEmitCompose({
  onEmitted,
}: {
  onEmitted?: () => void;
}) {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] =
    useState<BackendNotificationCategory>("announcements");
  const [priority, setPriority] =
    useState<BackendNotificationPriority>("normal");
  const [audienceMode, setAudienceMode] = useState<
    NotificationAudience | "manual"
  >("teachers");
  const [recipients, setRecipients] = useState<MessageRecipientDto[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [peopleQuery, setPeopleQuery] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (audienceMode !== "manual" || !instituteCtx.activeInstituteId) return;
    let cancelled = false;
    setRecipientsLoading(true);
    void listMessageRecipients({ instituteId: instituteCtx.activeInstituteId })
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) => {
          const roleDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
          if (roleDiff !== 0) return roleDiff;
          return a.displayName.localeCompare(b.displayName);
        });
        setRecipients(sorted);
        setRecipientsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setRecipients([]);
        setRecipientsLoading(false);
        notify(err instanceof Error ? err.message : "Failed to load people");
      });
    return () => {
      cancelled = true;
    };
  }, [audienceMode, instituteCtx.activeInstituteId, notify]);

  const filteredPeople = useMemo(() => {
    const q = peopleQuery.trim().toLowerCase();
    if (!q) return recipients;
    return recipients.filter((r) => {
      const cs = classSectionLabel(r) ?? "";
      const hay = `${r.displayName} ${roleLabel(r.role)} ${cs}`.toLowerCase();
      return hay.includes(q);
    });
  }, [peopleQuery, recipients]);

  const togglePerson = (person: MessageRecipientDto) => {
    setSelectedUserIds((prev) => {
      const selected = new Set(prev);
      const parentIds = person.linkedParentUserIds ?? [];
      if (selected.has(person.userId)) {
        selected.delete(person.userId);
        if (person.role === "student") {
          for (const parentId of parentIds) {
            const stillNeeded = recipients.some(
              (other) =>
                other.role === "student" &&
                other.userId !== person.userId &&
                selected.has(other.userId) &&
                (other.linkedParentUserIds ?? []).includes(parentId),
            );
            if (!stillNeeded) selected.delete(parentId);
          }
        }
      } else {
        selected.add(person.userId);
        if (person.role === "student") {
          for (const parentId of parentIds) selected.add(parentId);
        }
      }
      return [...selected];
    });
  };

  const send = () => {
    if (!writesEnabled || sending) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before sending a notification");
      return;
    }
    if (!title.trim() || !body.trim()) {
      notify("Title and body are required");
      return;
    }

    const base = {
      instituteId,
      category,
      priority,
      title: title.trim(),
      body: body.trim(),
      deepLink: null,
    };

    let emitInput:
      | (typeof base & { audience: NotificationAudience })
      | (typeof base & { recipientUserIds: string[] });

    if (audienceMode === "manual") {
      if (selectedUserIds.length === 0) {
        notify("Select at least one person");
        return;
      }
      emitInput = { ...base, recipientUserIds: selectedUserIds };
    } else {
      emitInput = { ...base, audience: audienceMode };
    }

    setSending(true);
    void emitNotification(emitInput)
      .then((result) => {
        const count = Array.isArray(result) ? result.length : null;
        setTitle("");
        setBody("");
        setSelectedUserIds([]);
        setPeopleQuery("");
        setPriority("normal");
        setCategory("announcements");
        notify(
          count != null
            ? `Notification sent to ${count} recipient(s)`
            : "Notification sent",
        );
        onEmitted?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to send notification");
      })
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <Card>
      <CardHeader
        title="Send notification"
        hint="Send to an audience or specific people"
      />
      <div className="space-y-4 px-5 pb-5">
        {!writesEnabled ? (
          <p className="text-sm text-muted-foreground">
            Select an active institute to send notifications.
          </p>
        ) : null}
        <Field label="Title" required>
          <TextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            disabled={!writesEnabled}
          />
        </Field>
        <Field label="Body" required>
          <TextArea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Message body"
            disabled={!writesEnabled}
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category">
            <Select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as BackendNotificationCategory)
              }
              disabled={!writesEnabled}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as BackendNotificationPriority)
              }
              disabled={!writesEnabled}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Audience"
          hint="Who should receive this notification"
          required
        >
          <Select
            value={audienceMode}
            onChange={(e) => {
              const next = e.target.value as NotificationAudience | "manual";
              setAudienceMode(next);
              if (next !== "manual") {
                setSelectedUserIds([]);
                setPeopleQuery("");
              }
            }}
            disabled={!writesEnabled}
          >
            {AUDIENCES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </Field>
        {audienceMode === "manual" ? (
          <Field
            label="People"
            hint={
              selectedUserIds.length > 0
                ? `${selectedUserIds.length} selected`
                : "Students show class-section; selecting a student also sends to linked parents"
            }
            required
          >
            <div className="space-y-2">
              <SearchInput
                placeholder="Search name, class…"
                value={peopleQuery}
                onChange={(e) => setPeopleQuery(e.target.value)}
                disabled={!writesEnabled || recipientsLoading}
              />
              <div className="max-h-52 overflow-y-auto rounded-md border border-border divide-y divide-border">
                {recipientsLoading ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    Loading people…
                  </p>
                ) : filteredPeople.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">
                    {recipients.length === 0 ? "No people found" : "No matches"}
                  </p>
                ) : (
                  filteredPeople.map((r) => {
                    const checked = selectedUserIds.includes(r.userId);
                    const parentCount = r.linkedParentUserIds?.length ?? 0;
                    return (
                      <label
                        key={r.userId}
                        className="flex items-start gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-muted/40"
                      >
                        <input
                          type="checkbox"
                          className="size-3.5 mt-0.5 accent-primary"
                          checked={checked}
                          disabled={!writesEnabled}
                          onChange={() => togglePerson(r)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate">
                            {recipientOptionLabel(r)}
                          </span>
                          {r.role === "student" && parentCount > 0 ? (
                            <span className="block text-[11px] text-muted-foreground">
                              + {parentCount} linked parent
                              {parentCount === 1 ? "" : "s"}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </Field>
        ) : null}
        <Button
          variant="primary"
          disabled={!writesEnabled || sending}
          onClick={send}
        >
          <Send className="size-3.5" /> Send
        </Button>
      </div>
    </Card>
  );
}
