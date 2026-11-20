import { useEffect, useState } from "react";
import { Button, Field, Select, TextArea, TextInput } from "@lumenx/ui-admin";
import { Loader2, Send } from "lucide-react";
import { ClassSectionAudienceField } from "@/components/ClassSectionMultiPicker";
import { DateTimePicker12h } from "@/components/DateTimePicker12h";
import { useAdminToast } from "@/components/AdminActionToast";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  apiClassAudienceSelectionValid,
  loadApiClassSectionAudienceOptions,
  resolveClassAudienceForApi,
  type ApiClassSectionAudienceOption,
} from "@/lib/class-section-audience";
import { createEvent, publishEvent } from "@/lib/events/mutations";
import type { EventAudienceScope, EventKind, EventReminder } from "@/lib/events/types";
import { shouldIgnoreDuplicateSendClick } from "@/lib/communications/send-category";
import { examClassDisplayLabel } from "@/lib/exam-timetable-data";

const VISIBILITY_OPTIONS = ["All", "Students", "Parents", "Teachers", "Classes"] as const;
type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number];

const EVENT_KINDS: { value: EventKind; label: string }[] = [
  { value: "meeting", label: "Meeting" },
  { value: "exam", label: "Exam" },
  { value: "function", label: "Function" },
  { value: "holiday", label: "Holiday" },
  { value: "custom", label: "Custom" },
];

function mapAudienceScope(visibility: VisibilityOption): EventAudienceScope {
  switch (visibility) {
    case "Students":
      return "students";
    case "Parents":
      return "parents";
    case "Teachers":
      return "teachers";
    case "Classes":
      return "classes";
    default:
      return "all";
  }
}

function parseDateTimeLocal(value: string): { date: string; time: string } {
  const trimmed = value.trim();
  if (!trimmed) return { date: "", time: "" };
  const [date, time] = trimmed.split("T");
  return { date: date ?? "", time: (time ?? "").slice(0, 5) };
}

/** Events module send — createEvent(source=events) then publishEvent. */
export function EventSendForm({ onSent }: { onSent?: () => void }) {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<EventKind>("meeting");
  const [customKindLabel, setCustomKindLabel] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<VisibilityOption>("All");
  const [classScope, setClassScope] = useState<"all" | "selected">("selected");
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [apiClassOptions, setApiClassOptions] = useState<ApiClassSectionAudienceOption[]>(
    [],
  );
  const [reminder, setReminder] = useState<EventReminder>("one_day");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!apiMode || !instituteCtx.activeInstituteId) {
      setApiClassOptions([]);
      return;
    }
    let cancelled = false;
    void loadApiClassSectionAudienceOptions(instituteCtx.activeInstituteId).then(
      (options) => {
        if (!cancelled) setApiClassOptions(options);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteCtx.activeInstituteId]);

  const classesValid = apiMode
    ? apiClassAudienceSelectionValid({
        visibilityIsClasses: visibility === "Classes",
        classScope,
        selectedKeys: classSectionKeys,
      })
    : visibility !== "Classes" ||
      classScope === "all" ||
      classSectionKeys.length > 0;

  const audienceLabel = () => {
    if (visibility !== "Classes") return visibility;
    if (classScope === "all") return "Classes · All";
    return `Classes · ${examClassDisplayLabel("selected", classSectionKeys)}`;
  };

  const reset = () => {
    setTitle("");
    setBody("");
    setKind("meeting");
    setCustomKindLabel("");
    setStartsAt("");
    setLocation("");
    setVisibility("All");
    setClassScope("selected");
    setClassSectionKeys([]);
    setReminder("one_day");
  };

  const submit = () => {
    if (shouldIgnoreDuplicateSendClick(sending)) return;
    if (!writesEnabled) return;
    const { date, time } = parseDateTimeLocal(startsAt);
    if (!title.trim() || !date) {
      notify("Title and start date/time are required");
      return;
    }
    if (kind === "custom" && !customKindLabel.trim()) {
      notify("Custom event type label is required");
      return;
    }
    if (!classesValid) {
      notify("Select class/section audience");
      return;
    }
    if (!apiMode) {
      notify("Event send is available in API mode");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before sending");
      return;
    }
    const audienceFields = resolveClassAudienceForApi({
      visibilityIsClasses: visibility === "Classes",
      classScope,
      selectedKeys: classSectionKeys,
      options: apiClassOptions,
      baseAudienceScope: mapAudienceScope(visibility),
      baseAudienceLabel: audienceLabel(),
    });
    if (!audienceFields.ok) {
      notify(audienceFields.error);
      return;
    }
    setSending(true);
    void createEvent({
      instituteId,
      title: title.trim(),
      kind,
      customKindLabel: kind === "custom" ? customKindLabel.trim() : null,
      source: "events",
      startsOn: date,
      startTime: time || null,
      audienceScope: audienceFields.fields.audienceScope,
      audienceLabel: audienceFields.fields.audienceLabel,
      classId: audienceFields.fields.classId,
      sectionId: audienceFields.fields.sectionId,
      location: location.trim() || null,
      description: body.trim() || null,
      reminder,
      published: false,
    })
      .then((created) => publishEvent(created.id).then(() => created))
      .then((created) => {
        reset();
        onSent?.();
        notify(`Event "${created.title}" published · ${audienceLabel()}`);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to publish event");
      })
      .finally(() => setSending(false));
  };

  const canSend =
    writesEnabled &&
    Boolean(title.trim()) &&
    Boolean(parseDateTimeLocal(startsAt).date) &&
    classesValid &&
    (kind !== "custom" || Boolean(customKindLabel.trim()));

  return (
    <div className="space-y-4">
      <Field label="Title" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Event title"
          disabled={sending}
        />
      </Field>
      <Field label="Body / message">
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          placeholder="Event details…"
          disabled={sending}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Event type" required>
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
            disabled={sending}
          >
            {EVENT_KINDS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
        {kind === "custom" ? (
          <Field label="Custom type label" required>
            <TextInput
              value={customKindLabel}
              onChange={(e) => setCustomKindLabel(e.target.value)}
              placeholder="e.g. Workshop"
              disabled={sending}
            />
          </Field>
        ) : (
          <Field label="Location">
            <TextInput
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Venue (optional)"
              disabled={sending}
            />
          </Field>
        )}
      </div>
      {kind === "custom" ? (
        <Field label="Location">
          <TextInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Venue (optional)"
            disabled={sending}
          />
        </Field>
      ) : null}
      <Field label="Starts" required>
        <DateTimePicker12h value={startsAt} onChange={setStartsAt} />
      </Field>
      <Field label="Audience">
        <Select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as VisibilityOption)}
          disabled={sending}
        >
          {VISIBILITY_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
      </Field>
      {visibility === "Classes" ? (
        <ClassSectionAudienceField
          scope={classScope}
          selectedKeys={classSectionKeys}
          onScopeChange={setClassScope}
          onSelectedKeysChange={setClassSectionKeys}
          options={apiMode ? apiClassOptions : undefined}
          required
          hint={
            apiMode
              ? "Pick one institute section (real UUID) — entire institute uses All classes"
              : "Choose which classes and sections can see this event"
          }
        />
      ) : null}
      <Field label="Reminder">
        <Select
          value={reminder}
          onChange={(e) => setReminder(e.target.value as EventReminder)}
          disabled={sending}
        >
          <option value="one_day">1 day before</option>
          <option value="one_hour">1 hour before</option>
          <option value="one_week_one_day">1 week + 1 day</option>
          <option value="none">No reminder</option>
        </Select>
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          disabled={sending || !canSend}
          onClick={() => submit()}
          className="gap-2"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Publish event
        </Button>
      </div>
    </div>
  );
}
