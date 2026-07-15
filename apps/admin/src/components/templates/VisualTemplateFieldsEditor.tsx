import type { ChangeEvent } from "react";
import { Field, TextInput, TextArea, Button } from "@lumenx/ui-admin";
import type { VisualTemplateFields } from "@/lib/template-management/types";
import { VariablePicker } from "@/components/templates/VariablePicker";
import { Upload, ImageIcon } from "lucide-react";

type Props = {
  fields: VisualTemplateFields;
  onChange: (fields: VisualTemplateFields) => void;
};

export function VisualTemplateFieldsEditor({ fields, onChange }: Props) {
  const patch = (partial: Partial<VisualTemplateFields>) =>
    onChange({ ...fields, ...partial });

  const onPhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => patch({ studentPhotoUrl: String(reader.result) });
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Click a section below to edit titles, wording, signatory names, and sample photo. Student
        names and grades fill in automatically when you issue certificates.
      </p>

      <Field label="Main title">
        <TextInput
          value={fields.titleMain}
          onChange={(e) => patch({ titleMain: e.target.value })}
          placeholder="CERTIFICATE"
        />
      </Field>
      <Field label="Subtitle">
        <TextInput
          value={fields.titleSub}
          onChange={(e) => patch({ titleSub: e.target.value })}
          placeholder="OF ACHIEVEMENT"
        />
      </Field>
      <Field label="Presentation line">
        <TextInput
          value={fields.presentationLine}
          onChange={(e) => patch({ presentationLine: e.target.value })}
          placeholder="This Certificate is Presented To :"
        />
      </Field>
      <Field label="Body text" hint="Use {{StudentName}}, {{Class}}, {{Grade}}, etc.">
        <TextArea
          rows={4}
          value={fields.bodyText}
          onChange={(e) => patch({ bodyText: e.target.value })}
        />
      </Field>

      <VariablePicker
        onInsert={(token) => patch({ bodyText: `${fields.bodyText} ${token}`.trim() })}
      />

      <div className="rounded-lg border border-border p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">Student photo on certificate</span>
          <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={fields.showStudentPhoto}
              onChange={(e) => patch({ showStudentPhoto: e.target.checked })}
              className="size-4 rounded"
            />
            Show photo
          </label>
        </div>
        {fields.showStudentPhoto && (
          <div className="flex items-center gap-3">
            <div className="size-14 rounded-full border border-border bg-muted overflow-hidden flex items-center justify-center shrink-0">
              {fields.studentPhotoUrl ? (
                <img src={fields.studentPhotoUrl} alt="" className="size-full object-cover" />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs font-medium border border-border bg-surface hover:bg-surface-hover cursor-pointer w-fit">
                <Upload className="size-3" /> Upload sample photo
                <input type="file" accept="image/*" className="hidden" onChange={onPhotoUpload} />
              </label>
              {fields.studentPhotoUrl && (
                <Button size="sm" type="button" onClick={() => patch({ studentPhotoUrl: "" })}>
                  Remove photo
                </Button>
              )}
              <p className="text-[10px] text-muted-foreground">
                Preview only — real student photos come from records at issue time.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Left signatory name">
          <TextInput
            value={fields.signatoryLeftName}
            onChange={(e) => patch({ signatoryLeftName: e.target.value })}
          />
        </Field>
        <Field label="Left signatory title">
          <TextInput
            value={fields.signatoryLeftTitle}
            onChange={(e) => patch({ signatoryLeftTitle: e.target.value })}
          />
        </Field>
        <Field label="Right signatory name">
          <TextInput
            value={fields.signatoryRightName}
            onChange={(e) => patch({ signatoryRightName: e.target.value })}
          />
        </Field>
        <Field label="Right signatory title">
          <TextInput
            value={fields.signatoryRightTitle}
            onChange={(e) => patch({ signatoryRightTitle: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}
