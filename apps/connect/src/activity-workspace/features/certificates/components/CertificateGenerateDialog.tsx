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
} from "@lumenx/ui";
import { isoDate } from "@/activity-workspace/hub/calendar";
import type { ActivityCertificateInput, CertificateTemplate } from "@/lib/activity/certificates/types";
import { CERTIFICATE_CATEGORY_LABELS } from "@/lib/activity/certificates/types";
import { CertificatePreviewFrame } from "./CertificatePreviewFrame";
import type { ActivityCertificate } from "@/lib/activity/certificates/types";
import { achievementsRepository } from "@/lib/activity/achievements/repositories";
import { createCertificateFromInput } from "@/lib/activity/certificates/mock";

type AchievementOption = {
  achievementId: string;
  label: string;
  studentName: string;
  date: string;
  hasCertificate: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievementOptions: AchievementOption[];
  templates: CertificateTemplate[];
  onSubmit: (input: ActivityCertificateInput) => Promise<void>;
};

function emptyForm(
  achievementOptions: AchievementOption[],
  templates: CertificateTemplate[],
): ActivityCertificateInput {
  const available = achievementOptions.filter((a) => !a.hasCertificate);
  const first = available[0] ?? achievementOptions[0];
  return {
    achievementId: first?.achievementId ?? "",
    templateId: templates[0]?.id ?? "",
    issueDate: first?.date ?? isoDate(new Date()),
  };
}

export function CertificateGenerateDialog({
  open,
  onOpenChange,
  achievementOptions,
  templates,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<ActivityCertificateInput>(
    emptyForm(achievementOptions, templates),
  );
  const [saving, setSaving] = useState(false);
  const [previewCert, setPreviewCert] = useState<ActivityCertificate | null>(null);

  const selectableAchievements = achievementOptions.filter((a) => !a.hasCertificate);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(achievementOptions, templates));
  }, [open, achievementOptions, templates]);

  useEffect(() => {
    if (!open || !form.achievementId || !form.templateId) {
      setPreviewCert(null);
      return;
    }
    void achievementsRepository.getAchievementById(form.achievementId).then((achievement) => {
      if (!achievement) {
        setPreviewCert(null);
        return;
      }
      try {
        setPreviewCert(createCertificateFromInput(form, achievement, 9999, "preview"));
      } catch {
        setPreviewCert(null);
      }
    });
  }, [open, form]);

  const handleAchievementChange = (achievementId: string) => {
    const opt = achievementOptions.find((a) => a.achievementId === achievementId);
    setForm((prev) => ({
      ...prev,
      achievementId,
      issueDate: opt?.date ?? prev.issueDate,
    }));
  };

  const handleSubmit = async () => {
    if (!form.achievementId || !form.templateId) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const unavailable = selectableAchievements.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">Generate Certificate</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <FormSection title="Achievement reference">
            <Field label="Achievement" required>
              {unavailable ? (
                <p className="text-xs text-muted-foreground">
                  No awarded achievements available — award achievements first, or all already have
                  certificates.
                </p>
              ) : (
                <Select value={form.achievementId} onValueChange={handleAchievementChange}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select achievement" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableAchievements.map((a) => (
                      <SelectItem key={a.achievementId} value={a.achievementId}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
            <p className="text-[10px] text-muted-foreground">
              Every certificate is generated from exactly one awarded achievement.
            </p>
          </FormSection>

          <FormSection title="Template & category">
            <Field label="Certificate template" required>
              <Select
                value={form.templateId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, templateId: v }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {CERTIFICATE_CATEGORY_LABELS[t.category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Issue date" required>
              <Input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm((prev) => ({ ...prev, issueDate: e.target.value }))}
                className="rounded-xl"
              />
            </Field>
          </FormSection>

          {previewCert ? (
            <FormSection title="Preview">
              <CertificatePreviewFrame certificate={previewCert} />
            </FormSection>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={saving || unavailable || !form.achievementId || !form.templateId}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Generating…" : "Generate & Issue"}
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
