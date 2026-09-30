import { useState, type ChangeEvent } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  Pill,
  PageStack,
} from "@lumenx/ui-admin";
import type { ImportStep } from "@/lib/template-management/types";
import { TEMPLATE_VARIABLES } from "@/lib/template-management/categories";
import { addImportJob } from "@/lib/template-management/store";
import { useAdminToast } from "@/components/AdminActionToast";
import { DESIGN_UPLOAD_ACCEPT, DESIGN_UPLOAD_HINT, parseDesignUpload } from "@/lib/template-management/office-upload";
import { Upload, ChevronRight, CheckCircle2 } from "lucide-react";

const STEPS: ImportStep[] = ["upload", "detect", "map", "preview", "save"];

const STEP_LABEL: Record<ImportStep, string> = {
  upload: "Upload",
  detect: "Detect elements",
  map: "Map variables",
  preview: "Preview",
  save: "Save template",
};

export function TemplateImportsView() {
  const notify = useAdminToast();
  const [step, setStep] = useState<ImportStep>("upload");
  const [fileName, setFileName] = useState("");
  const [format, setFormat] = useState<"ppt" | "pptx">("pptx");
  const [mapped, setMapped] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(step);

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const parsed = parseDesignUpload(file);
    if (!parsed) {
      setError(`Only ${DESIGN_UPLOAD_HINT.toLowerCase()}.`);
      return;
    }
    setError(null);
    setFileName(parsed.name);
    setFormat(parsed.format);
    setStep("detect");
  };

  const finish = () => {
    addImportJob({
      id: `imp-${Date.now()}`,
      fileName,
      format,
      step: "save",
      uploadedAt: new Date().toISOString(),
      mappedVariables: mapped,
    });
    notify(`Imported template from ${fileName}`);
    setStep("upload");
    setFileName("");
    setMapped([]);
  };

  return (
    <PageStack>
      <Card>
        <CardHeader title="Import workflow" hint={DESIGN_UPLOAD_HINT} />
        <CardBody>
          <div className="flex flex-wrap gap-2 mb-6">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <Pill tone={i <= stepIndex ? "success" : "neutral"}>{STEP_LABEL[s]}</Pill>
                {i < STEPS.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
              </div>
            ))}
          </div>

          {step === "upload" && (
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-12 cursor-pointer hover:bg-muted/20 transition-colors">
                <Upload className="size-8 text-muted-foreground" />
                <span className="text-sm font-medium">Upload institute template file</span>
                <span className="text-xs text-muted-foreground">{DESIGN_UPLOAD_HINT}</span>
                <input type="file" accept={DESIGN_UPLOAD_ACCEPT} className="hidden" onChange={onFile} />
              </label>
              {error && <p className="text-xs text-destructive text-center">{error}</p>}
            </div>
          )}

          {step === "detect" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Analyzing <span className="font-medium text-foreground">{fileName}</span>…
                Detected header, body text, signature area, and 4 placeholder regions.
              </p>
              <Button variant="primary" onClick={() => setStep("map")}>
                Continue to variable mapping
              </Button>
            </div>
          )}

          {step === "map" && (
            <div className="space-y-4 max-w-lg">
              <Field label="Map detected fields" hint="Select one or more variables">
                <div className="max-h-[220px] overflow-y-auto rounded-lg border border-border bg-popover p-1">
                  {TEMPLATE_VARIABLES.map((v) => {
                    const checked = mapped.includes(v.key);
                    return (
                      <label
                        key={v.key}
                        className={`flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                          checked
                            ? "bg-primary/12 font-medium text-primary"
                            : "text-popover-foreground"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-3.5 accent-primary"
                          checked={checked}
                          onChange={() => {
                            setMapped((prev) =>
                              checked
                                ? prev.filter((key) => key !== v.key)
                                : [...prev, v.key],
                            );
                          }}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {v.label} — {`{{${v.key}}}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </Field>
              <p className="text-xs text-muted-foreground">
                {mapped.length} variable{mapped.length === 1 ? "" : "s"} selected
              </p>
              <Button variant="primary" onClick={() => setStep("preview")}>
                Preview mapped template
              </Button>
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground min-h-[200px] flex items-center justify-center">
                Preview of {fileName} with {mapped.length || "default"} mapped variables
              </div>
              <Button variant="primary" onClick={() => setStep("save")}>
                Confirm and save
              </Button>
            </div>
          )}

          {step === "save" && (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="size-10 text-success mx-auto" />
              <p className="text-sm font-medium">Ready to save imported template</p>
              <Button variant="primary" onClick={finish}>
                Save to template library
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}
