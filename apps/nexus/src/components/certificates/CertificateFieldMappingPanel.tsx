import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Pill,
  SegmentedControl,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import {
  CERTIFICATE_FIELD_SOURCES,
  addCertificateTemplateTarget,
  clearCertificateFieldMapping,
  ensureCertificateTemplateTargets,
  getCertificateCatalogField,
  listCertificateFieldsBySource,
  saveCertificateFieldMapping,
  type CertificateFieldSource,
  type CertificateTemplate,
} from "@lumenx/module-certificates";

export function CertificateFieldMappingPanel({
  template,
  onClose,
  onTemplateChange,
}: {
  template: CertificateTemplate;
  onClose: () => void;
  onTemplateChange?: (template: CertificateTemplate) => void;
}) {
  const [working, setWorking] = useState(template);
  const [selectedTargetId, setSelectedTargetId] = useState(template.targets[0]?.id ?? "");
  const [source, setSource] = useState<CertificateFieldSource>("student");
  const [displayName, setDisplayName] = useState("");
  const [dataFieldId, setDataFieldId] = useState("");
  const [required, setRequired] = useState<"required" | "optional">("required");
  const [manualName, setManualName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitWorking = (next: CertificateTemplate) => {
    if (next.id !== working.id) {
      setNotice(
        `Created draft v${next.version}. Publish it to make this version available to Admin. Previous published versions stay unchanged.`,
      );
    }
    setWorking(next);
    onTemplateChange?.(next);
  };

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void ensureCertificateTemplateTargets(template.id)
      .then((next) => {
        if (cancelled) return;
        if (next.id !== template.id) commitWorking(next);
        else setWorking(next);
        setSelectedTargetId((prev) => prev || next.targets[0]?.id || "");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not read template text boxes");
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [template.id]);

  const mappingByTarget = useMemo(() => {
    return new Map(working.mappings.map((item) => [item.targetId, item]));
  }, [working.mappings]);

  const selectedTarget = working.targets.find((item) => item.id === selectedTargetId) ?? null;
  const selectedMapping = selectedTarget ? mappingByTarget.get(selectedTarget.id) : undefined;
  const fields = listCertificateFieldsBySource(source);

  useEffect(() => {
    if (!selectedTarget) {
      setDisplayName("");
      setDataFieldId("");
      setRequired("required");
      return;
    }
    const mapping = mappingByTarget.get(selectedTarget.id);
    if (mapping) {
      const field = getCertificateCatalogField(mapping.dataFieldId);
      setDisplayName(mapping.displayName);
      setDataFieldId(mapping.dataFieldId);
      setRequired(mapping.required ? "required" : "optional");
      if (field) setSource(field.source);
      return;
    }
    setDisplayName(selectedTarget.previewText || selectedTarget.name);
    setDataFieldId("");
    setRequired("required");
  }, [selectedTarget, mappingByTarget]);

  const applyMapping = (nextFieldId: string, nextRequired: boolean, nextLabel: string) => {
    if (!selectedTarget) return;
    try {
      const next = saveCertificateFieldMapping(working.id, {
        targetId: selectedTarget.id,
        dataFieldId: nextFieldId,
        displayName: nextLabel,
        required: nextRequired,
      });
      commitWorking(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save mapping");
    }
  };

  const onPickField = (id: string) => {
    setDataFieldId(id);
    const field = getCertificateCatalogField(id);
    if (!field || !selectedTarget) return;
    const label = displayName.trim() || field.displayName;
    setDisplayName(label);
    setRequired(field.defaultRequired ? "required" : "optional");
    applyMapping(field.id, field.defaultRequired, label);
  };

  const onToggleRequired = (value: "required" | "optional") => {
    setRequired(value);
    if (!dataFieldId) return;
    applyMapping(dataFieldId, value === "required", displayName);
  };

  const onBlurDisplayName = () => {
    if (!dataFieldId) return;
    applyMapping(dataFieldId, required === "required", displayName);
  };

  const addTarget = () => {
    try {
      const next = addCertificateTemplateTarget(working.id, manualName);
      commitWorking(next);
      setSelectedTargetId(next.targets[next.targets.length - 1]?.id ?? "");
      setManualName("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add target");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{working.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {working.status === "draft"
              ? "Select a text box, then assign a LumenX field. Required fields cannot be empty later."
              : "This version is frozen. Saving changes creates a new draft version. Published snapshots stay unchanged."}
          </p>
        </div>
        <Button onClick={onClose}>Done</Button>
      </div>
      {working.status === "published" ? (
        <p className="text-xs text-muted-foreground">
          Published v{working.version} is available to Admin. Edits create a new version.
        </p>
      ) : working.status === "archived" ? (
        <p className="text-xs text-muted-foreground">
          Archived v{working.version} is not available to Admin. Edits create a new draft version.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Draft v{working.version}. Publish it to make this version available to Admin.
        </p>
      )}
      {notice ? <p className="text-xs text-success">{notice}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {busy ? <p className="text-xs text-muted-foreground">Reading text boxes from the template…</p> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader
            title="Template text boxes"
            hint={
              working.file.format === "ppt"
                ? "Older PPT files need named target areas"
                : "Detected from the uploaded PPTX"
            }
          />
          <CardBody className="space-y-3">
            {working.targets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No text boxes were detected. Add a named target area, then map a field.
              </p>
            ) : (
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {working.targets.map((target) => {
                  const mapped = mappingByTarget.get(target.id);
                  const active = target.id === selectedTargetId;
                  const catalogField = mapped
                    ? getCertificateCatalogField(mapped.dataFieldId)
                    : undefined;
                  return (
                    <li key={target.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedTargetId(target.id)}
                        className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">{target.name}</span>
                          {mapped ? (
                            <Pill tone={mapped.required ? "warning" : "neutral"}>
                              {mapped.required ? "Required" : "Optional"}
                            </Pill>
                          ) : (
                            <Pill tone="neutral">Unmapped</Pill>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground truncate">
                          {mapped
                            ? `→ ${mapped.displayName}`
                            : target.previewText || "Empty text box"}
                        </p>
                        {catalogField ? (
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground/80 truncate">
                            {catalogField.dataField}
                          </p>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="flex gap-2">
              <TextInput
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Add target area name"
              />
              <Button onClick={addTarget} disabled={!manualName.trim()}>
                Add
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Assign LumenX field" hint="Display name, data field, required or optional" />
          <CardBody className="space-y-4">
            {!selectedTarget ? (
              <p className="text-sm text-muted-foreground">Select a text box first.</p>
            ) : (
              <>
                <p className="text-sm">
                  <span className="text-muted-foreground">Selected textbox</span>
                  {selectedTarget.name ? (
                    <span className="text-muted-foreground"> ({selectedTarget.name})</span>
                  ) : null}
                  {" → "}
                  <span className="font-medium">
                    {selectedMapping?.displayName || displayName.trim() || "choose a LumenX field"}
                  </span>
                </p>
                {selectedTarget.previewText ? (
                  <p className="text-[11px] text-muted-foreground">
                    Current text: “{selectedTarget.previewText}”
                  </p>
                ) : null}
                <Field label="Source">
                  <Select
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value as CertificateFieldSource);
                      setDataFieldId("");
                    }}
                  >
                    {CERTIFICATE_FIELD_SOURCES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Data field"
                  required
                  hint={getCertificateCatalogField(dataFieldId)?.dataField}
                >
                  <Select value={dataFieldId} onChange={(e) => onPickField(e.target.value)}>
                    <option value="">Select a field</option>
                    {fields.map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Display name" required>
                  <TextInput
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onBlur={onBlurDisplayName}
                    placeholder="Student Name"
                  />
                </Field>
                <Field
                  label="Required / Optional"
                  hint="Required: missing value is not allowed. Optional: missing value is allowed."
                >
                  <SegmentedControl
                    value={required}
                    onChange={onToggleRequired}
                    options={[
                      { value: "required", label: "Required" },
                      { value: "optional", label: "Optional" },
                    ]}
                  />
                </Field>
                {selectedMapping ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const next = clearCertificateFieldMapping(working.id, selectedTarget.id);
                      commitWorking(next);
                      setDataFieldId("");
                    }}
                  >
                    Clear mapping
                  </Button>
                ) : null}
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
