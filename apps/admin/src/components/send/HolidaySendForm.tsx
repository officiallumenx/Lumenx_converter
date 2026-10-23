import { useState } from "react";
import { Button, Field, TextArea, TextInput } from "@lumenx/ui-admin";
import { Loader2, Send } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { createEvent } from "@/lib/events/mutations";
import { shouldIgnoreDuplicateSendClick } from "@/lib/communications/send-category";

/** Calendar holiday send — same contract as Calendar page (createEvent kind=holiday). */
export function HolidaySendForm({ onSent }: { onSent?: () => void }) {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState("");
  const [sending, setSending] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setDate("");
  };

  const submit = () => {
    if (shouldIgnoreDuplicateSendClick(sending)) return;
    if (!writesEnabled) return;
    if (!title.trim() || !date.trim()) {
      notify("Title and date are required");
      return;
    }
    if (!apiMode) {
      notify("Holiday send is available in API mode");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before sending");
      return;
    }
    setSending(true);
    void createEvent({
      instituteId,
      title: title.trim(),
      kind: "holiday",
      source: "calendar",
      startsOn: date.trim(),
      description: body.trim() || null,
      published: true,
    })
      .then((created) => {
        reset();
        onSent?.();
        notify(`Holiday "${created.title}" published to calendar`);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to publish holiday");
      })
      .finally(() => setSending(false));
  };

  return (
    <div className="space-y-4">
      <Field label="Title" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Diwali holiday"
          disabled={sending}
        />
      </Field>
      <Field label="Body / message">
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Optional details for the holiday…"
          disabled={sending}
        />
      </Field>
      <Field label="Date" required hint="Institute-wide calendar holiday">
        <TextInput
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={sending}
        />
      </Field>
      <p className="text-[11px] text-muted-foreground">
        Audience: entire institute (calendar holidays). History under Calendar.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          disabled={sending || !writesEnabled || !title.trim() || !date.trim()}
          onClick={() => submit()}
          className="gap-2"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Publish holiday
        </Button>
      </div>
    </div>
  );
}
