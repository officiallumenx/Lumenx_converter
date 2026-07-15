import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from "@lumenx/ui";
import { isoDate } from "@/activity-workspace/hub/calendar";
import { PARTICIPANT_STUDENT_OPTIONS } from "@/activity-workspace/shared/lib/participant-mock-data";
import type {
  AchievementLevel,
  AchievementSourceModule,
  AchievementType,
  ActivityAchievement,
  ActivityAchievementInput,
} from "@/lib/activity/achievements/types";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_SOURCE_MODULE_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
} from "@/lib/activity/achievements/types";
import { defaultAchievementNotificationPrefs } from "@/lib/activity/achievements/notifications";
import { achievementsRepository } from "@/lib/activity/achievements/repositories";

type SourceOption = {
  recordId: string;
  recordKind: ActivityAchievementInput["sourceRecordKind"];
  label: string;
  date: string;
  module: AchievementSourceModule;
};

type TeamOption = { id: string; name: string };

const TYPE_OPTIONS = Object.entries(ACHIEVEMENT_TYPE_LABELS) as [AchievementType, string][];
const LEVEL_OPTIONS = Object.entries(ACHIEVEMENT_LEVEL_LABELS) as [AchievementLevel, string][];
const MODULE_OPTIONS = Object.entries(ACHIEVEMENT_SOURCE_MODULE_LABELS) as [
  AchievementSourceModule,
  string,
][];

function studentClassLabel(id: string): string {
  const s = PARTICIPANT_STUDENT_OPTIONS.find((x) => x.id === id);
  return s ? `${s.className}-${s.section}` : "";
}

function emptyForm(
  sourceOptions: SourceOption[],
  lockedSourceModule?: AchievementSourceModule,
): ActivityAchievementInput {
  const module = lockedSourceModule ?? sourceOptions[0]?.module ?? "sports";
  const firstSource = sourceOptions.find((s) => s.module === module) ?? sourceOptions[0];
  const firstStudent = PARTICIPANT_STUDENT_OPTIONS[0];
  return {
    title: "",
    achievementType: "participation",
    level: "school",
    sourceModule: module,
    sourceRecordId: firstSource?.recordId ?? "",
    sourceRecordKind: firstSource?.recordKind ?? "match_result",
    studentId: firstStudent?.id ?? "",
    studentName: firstStudent?.name ?? "",
    studentClassLabel: firstStudent ? studentClassLabel(firstStudent.id) : "",
    date: firstSource?.date ?? isoDate(new Date()),
    description: "",
    notifications: defaultAchievementNotificationPrefs(),
  };
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  achievement?: ActivityAchievement | null;
  sourceOptions: SourceOption[];
  teamOptions: TeamOption[];
  lockedSourceModule?: AchievementSourceModule;
  onSubmit: (input: ActivityAchievementInput) => Promise<void>;
};

export function AchievementFormDialog({
  open,
  onOpenChange,
  mode,
  achievement,
  sourceOptions,
  teamOptions,
  lockedSourceModule,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ActivityAchievementInput>(
    emptyForm(sourceOptions, lockedSourceModule),
  );
  const [saving, setSaving] = useState(false);
  const [moduleSourceOptions, setModuleSourceOptions] = useState<SourceOption[]>(sourceOptions);

  useEffect(() => {
    if (!open) return;
    const mod = lockedSourceModule ?? form.sourceModule;
    setModuleSourceOptions(
      achievementsRepository.listEligibleSourceOptions(mod) as SourceOption[],
    );
  }, [open, form.sourceModule, lockedSourceModule, sourceOptions]);

  const selectableSourceOptions = moduleSourceOptions;

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && achievement) {
      setForm({
        title: achievement.title,
        achievementType: achievement.achievementType,
        level: achievement.level,
        sourceModule: achievement.source.module,
        sourceRecordId: achievement.source.recordId,
        sourceRecordKind: achievement.source.recordKind,
        studentId: achievement.studentId,
        studentName: achievement.studentName,
        studentClassLabel: achievement.studentClassLabel,
        teamId: achievement.teamId,
        teamName: achievement.teamName,
        date: achievement.date,
        description: achievement.description,
        notifications: { ...achievement.notifications },
      });
    } else {
      setForm(emptyForm(sourceOptions, lockedSourceModule));
    }
  }, [open, mode, achievement, sourceOptions, lockedSourceModule]);

  const set = <K extends keyof ActivityAchievementInput>(key: K, value: ActivityAchievementInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleModuleChange = (module: AchievementSourceModule) => {
    const options = achievementsRepository.listEligibleSourceOptions(module) as SourceOption[];
    const first = options[0];
    setModuleSourceOptions(options);
    setForm((prev) => ({
      ...prev,
      sourceModule: module,
      sourceRecordId: first?.recordId ?? "",
      sourceRecordKind: first?.recordKind ?? "match_result",
      date: first?.date ?? prev.date,
    }));
  };

  const handleSourceChange = (recordId: string) => {
    const source = selectableSourceOptions.find((s) => s.recordId === recordId);
    if (!source) return;
    setForm((prev) => ({
      ...prev,
      sourceRecordId: source.recordId,
      sourceRecordKind: source.recordKind,
      date: source.date,
    }));
  };

  const handleStudentChange = (studentId: string) => {
    const student = PARTICIPANT_STUDENT_OPTIONS.find((s) => s.id === studentId);
    if (!student) return;
    setForm((prev) => ({
      ...prev,
      studentId: student.id,
      studentName: student.name,
      studentClassLabel: studentClassLabel(student.id),
    }));
  };

  const handleTeamChange = (teamId: string) => {
    if (teamId === "none") {
      setForm((prev) => ({ ...prev, teamId: undefined, teamName: undefined }));
      return;
    }
    const team = teamOptions.find((t) => t.id === teamId);
    setForm((prev) => ({
      ...prev,
      teamId,
      teamName: team?.name,
    }));
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.studentId || !form.sourceRecordId) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        notifications: form.notifications ?? defaultAchievementNotificationPrefs(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === "create" ? "Add Achievement" : "Edit Achievement";
  const sourceUnavailable = selectableSourceOptions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormSection title="General">
            <Field label="Achievement title" required>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Inter-School Football MVP"
                className="rounded-xl"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Achievement type" required>
                <Select
                  value={form.achievementType}
                  onValueChange={(v) => set("achievementType", v as AchievementType)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(([val, text]) => (
                      <SelectItem key={val} value={val}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Achievement level" required>
                <Select
                  value={form.level}
                  onValueChange={(v) => set("level", v as AchievementLevel)}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVEL_OPTIONS.map(([val, text]) => (
                      <SelectItem key={val} value={val}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Date" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="rounded-xl"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Recognition details for certificates and student profile"
                className="min-h-[80px] rounded-xl"
              />
            </Field>
          </FormSection>

          <FormSection title="Source">
            {!lockedSourceModule ? (
              <Field label="Source module" required>
                <Select value={form.sourceModule} onValueChange={handleModuleChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_OPTIONS.map(([val, text]) => (
                      <SelectItem key={val} value={val}>
                        {text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <p className="text-xs text-muted-foreground">
                Source module: {ACHIEVEMENT_SOURCE_MODULE_LABELS[lockedSourceModule]}
              </p>
            )}
            <Field label="Source record" required>
              {sourceUnavailable ? (
                <p className="text-xs text-warning-foreground">
                  No source records available for this module yet.
                </p>
              ) : (
                <Select value={form.sourceRecordId} onValueChange={handleSourceChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select source record" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableSourceOptions.map((s) => (
                      <SelectItem key={s.recordId} value={s.recordId}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          </FormSection>

          <FormSection title="Student & team">
            <Field label="Student" required>
              <Select value={form.studentId} onValueChange={handleStudentChange}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPANT_STUDENT_OPTIONS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} · Class {s.className}-{s.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Team (optional)">
              <Select value={form.teamId ?? "none"} onValueChange={handleTeamChange}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="No team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No team</SelectItem>
                  {teamOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FormSection>

          <FormSection title="Notifications">
            <ToggleRow
              label="Notify student"
              checked={form.notifications?.notifyStudent ?? true}
              onCheckedChange={(checked) =>
                set("notifications", {
                  ...(form.notifications ?? defaultAchievementNotificationPrefs()),
                  notifyStudent: checked,
                })
              }
            />
            <ToggleRow
              label="Notify parents"
              checked={form.notifications?.notifyParents ?? false}
              onCheckedChange={(checked) =>
                set("notifications", {
                  ...(form.notifications ?? defaultAchievementNotificationPrefs()),
                  notifyParents: checked,
                })
              }
            />
            <ToggleRow
              label="Notify teachers"
              checked={form.notifications?.notifyTeachers ?? false}
              onCheckedChange={(checked) =>
                set("notifications", {
                  ...(form.notifications ?? defaultAchievementNotificationPrefs()),
                  notifyTeachers: checked,
                })
              }
            />
          </FormSection>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={saving || !form.title.trim() || !form.studentId || sourceUnavailable}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Saving…" : mode === "create" ? "Add Achievement" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-muted/5 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} aria-label={label} />
    </div>
  );
}
