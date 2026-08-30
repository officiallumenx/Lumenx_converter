import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@lumenx/ui-admin";
import { Send } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  emitNotification,
  type BackendNotificationCategory,
  type BackendNotificationPriority,
  type NotificationAudience,
} from "@/lib/notification-inbox";

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
  { value: "manual", label: "Specific user IDs" },
];

function parseRecipientIds(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** API-mode emit — role audience (server-resolved) or explicit user profile UUIDs. */
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
  const [recipientIdsRaw, setRecipientIdsRaw] = useState("");
  const [deepLink, setDeepLink] = useState("/notifications");
  const [sending, setSending] = useState(false);

  const send = () => {
    if (!writesEnabled || sending) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before emitting a notification");
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
      deepLink: deepLink.trim() || null,
    };

    let emitInput:
      | (typeof base & { audience: NotificationAudience })
      | (typeof base & { recipientUserIds: string[] });

    if (audienceMode === "manual") {
      const recipientUserIds = parseRecipientIds(recipientIdsRaw);
      if (recipientUserIds.length === 0) {
        notify("Add at least one recipient user UUID");
        return;
      }
      const invalid = recipientUserIds.find((id) => !isInstituteUuid(id));
      if (invalid) {
        notify(`Invalid recipient UUID: ${invalid}`);
        return;
      }
      emitInput = { ...base, recipientUserIds };
    } else {
      emitInput = { ...base, audience: audienceMode };
    }

    setSending(true);
    void emitNotification(emitInput)
      .then((result) => {
        const count = Array.isArray(result) ? result.length : null;
        setTitle("");
        setBody("");
        setRecipientIdsRaw("");
        setDeepLink("/notifications");
        setPriority("normal");
        setCategory("announcements");
        notify(
          count != null
            ? `Notification emitted to ${count} recipient(s)`
            : "Notification emitted",
        );
        onEmitted?.();
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to emit notification");
      })
      .finally(() => {
        setSending(false);
      });
  };

  return (
    <div className="grid grid-cols-12 gap-4">
      <Card className="col-span-12 lg:col-span-8">
        <CardHeader
          title="Emit notification"
          hint="POST /api/v1/notifications · audience or recipient_user_ids"
        />
        <div className="space-y-4 px-5 pb-5">
          {!writesEnabled ? (
            <p className="text-sm text-muted-foreground">
              Select an active institute to emit notifications.
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
            hint="Resolved server-side from active institute memberships (role-based)"
            required
          >
            <Select
              value={audienceMode}
              onChange={(e) =>
                setAudienceMode(
                  e.target.value as NotificationAudience | "manual",
                )
              }
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
              label="Recipient user IDs"
              hint="Comma-separated user profile UUIDs"
              required
            >
              <TextArea
                value={recipientIdsRaw}
                onChange={(e) => setRecipientIdsRaw(e.target.value)}
                rows={3}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                disabled={!writesEnabled}
              />
            </Field>
          ) : null}
          <Field label="Deep link">
            <TextInput
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
              disabled={!writesEnabled}
            />
          </Field>
          <Button
            variant="primary"
            disabled={!writesEnabled || sending}
            onClick={send}
          >
            <Send className="size-3.5" /> Emit
          </Button>
        </div>
      </Card>
      <Card className="col-span-12 lg:col-span-4">
        <CardHeader title="API contract" />
        <div className="space-y-2 px-5 pb-5 text-xs text-muted-foreground">
          <p>
            Role audiences (everyone / students / parents / teachers) resolve to
            active members of the current institute only. Backend re-validates
            membership before insert.
          </p>
          <p>
            Class / section selective broadcast is not available — student and
            parent portal identity linking is incomplete.
          </p>
          <p>Template CRUD is not exposed; emit without template_id.</p>
          <p>Authorization failures surface as toast errors (no demo fallback).</p>
        </div>
      </Card>
    </div>
  );
}
