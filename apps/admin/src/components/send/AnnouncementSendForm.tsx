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
import {
  createAnnouncement,
  type AnnouncementAudienceScope,
} from "@/lib/announcements";
import { shouldIgnoreDuplicateSendClick } from "@/lib/communications/send-category";
import { examClassDisplayLabel } from "@/lib/exam-timetable-data";

const VISIBILITY_OPTIONS = ["All", "Students", "Parents", "Teachers", "Classes"] as const;
type VisibilityOption = (typeof VISIBILITY_OPTIONS)[number];

function mapAudienceScope(visibility: VisibilityOption): AnnouncementAudienceScope {
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

export function AnnouncementSendForm({ onSent }: { onSent?: () => void }) {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState<VisibilityOption>("All");
  const [classScope, setClassScope] = useState<"all" | "selected">("selected");
  const [classSectionKeys, setClassSectionKeys] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [apiClassOptions, setApiClassOptions] = useState<ApiClassSectionAudienceOption[]>(
    [],
  );
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
    setVisibility("All");
    setClassScope("selected");
    setClassSectionKeys([]);
    setScheduleAt("");
  };

  const submit = (asDraft = false) => {
    if (shouldIgnoreDuplicateSendClick(sending)) return;
    if (!writesEnabled || !title.trim() || !classesValid) {
      if (!title.trim()) notify("Title is required");
      else if (!classesValid) notify("Select class/section audience");
      return;
    }
    if (!apiMode) {
      notify("Announcement send is available in API mode");
      return;
    }
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute before publishing");
      return;
    }
    const willSchedule = !asDraft && scheduleAt.trim().length > 0;
    const scheduledAt =
      willSchedule && scheduleAt.trim()
        ? new Date(scheduleAt).toISOString()
        : null;
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
    void createAnnouncement({
      instituteId,
      title: title.trim(),
      body: body.trim() || null,
      audienceScope: audienceFields.fields.audienceScope,
      audienceLabel: audienceFields.fields.audienceLabel,
      classId: audienceFields.fields.classId,
      sectionId: audienceFields.fields.sectionId,
      scheduledAt,
      publishNow: !asDraft && !willSchedule,
    })
      .then((created) => {
        reset();
        onSent?.();
        if (asDraft) notify("Announcement saved as draft");
        else if (willSchedule)
          notify(`"${created.title}" scheduled · ${audienceLabel()}`);
        else notify(`"${created.title}" published · ${audienceLabel()}`);
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create announcement");
      })
      .finally(() => setSending(false));
  };

  return (
    <div className="space-y-4">
      <Field label="Title" required>
        <TextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          disabled={sending}
        />
      </Field>
      <Field label="Body / message">
        <TextArea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Write the announcement…"
          disabled={sending}
        />
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
              : "Choose which classes and sections can see this announcement"
          }
        />
      ) : null}
      <Field label="Schedule (optional)" hint="Leave empty to publish immediately">
        <DateTimePicker12h value={scheduleAt} onChange={setScheduleAt} />
      </Field>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={sending || !writesEnabled || !title.trim()}
          onClick={() => submit(true)}
        >
          Save draft
        </Button>
        <Button
          type="button"
          disabled={sending || !writesEnabled || !title.trim() || !classesValid}
          onClick={() => submit(false)}
          className="gap-2"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {scheduleAt.trim() ? "Schedule" : "Publish"}
        </Button>
      </div>
    </div>
  );
}
