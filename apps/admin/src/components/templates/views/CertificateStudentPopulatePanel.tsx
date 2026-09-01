import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Pill,
  SearchInput,
  TextInput,
} from "@lumenx/ui-admin";
import {
  applyCertificateIssuanceOverrides,
  applyCertificateNumberToFields,
  certificateRequiredFieldsComplete,
  copyCertificateIssuanceValue,
  isCertificateFieldStudentSpecific,
  isCertificateNumberDataField,
  populateCertificateMappings,
  type CertificateFieldMapping,
  type CertificateIssuanceOverrides,
  type CertificateTemplate,
  type PopulatedCertificateMapping,
} from "@lumenx/module-certificates";
import type { DemoInstituteProfile } from "@lumenx/types";
import { Users } from "lucide-react";
import { CertificateIssueActions } from "@/components/templates/CertificateIssueActions";
import { certificatePopulateContextForStudent } from "@/lib/certificate-populate-context";
import {
  peekCertificateNumbers,
  subscribeCertificateNumbering,
} from "@/lib/certificate-numbering-store";
import {
  loadStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";

type StudentFill = {
  student: StudentDirectoryRecord;
  fields: PopulatedCertificateMapping[];
  requiredMissing: number;
  optionalMissing: number;
  ready: boolean;
};

function FieldRow({
  field,
  draftValue,
  canApplyToAll,
  onIssuanceChange,
  onApplyToAll,
}: {
  field: PopulatedCertificateMapping;
  draftValue: string;
  canApplyToAll: boolean;
  onIssuanceChange: (targetId: string, value: string) => void;
  onApplyToAll: (targetId: string, value: string) => void;
}) {
  if (isCertificateNumberDataField(field.dataFieldId)) {
    return (
      <li className="flex items-start justify-between gap-3 py-2.5">
        <p className="min-w-0 text-sm">
          <span className="text-muted-foreground">{field.displayName}</span>
          {field.value ? (
            <>
              <span className="mx-1.5 text-success">✓</span>
              <span className="font-mono font-medium">{field.value}</span>
            </>
          ) : (
            <span className="ml-1.5 text-muted-foreground">Assigned on issue</span>
          )}
        </p>
        <span className="shrink-0 text-[10px] text-muted-foreground">Institute sequence</span>
      </li>
    );
  }

  if (field.source === "record" && field.status === "complete") {
    return (
      <li className="flex items-start justify-between gap-3 py-2.5">
        <p className="min-w-0 text-sm">
          <span className="text-muted-foreground">{field.displayName}</span>
          <span className="mx-1.5 text-success">✓</span>
          <span className="font-medium">{field.value}</span>
        </p>
      </li>
    );
  }

  const required = field.required;
  const complete = field.status === "complete";
  return (
    <li className="space-y-1.5 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="text-muted-foreground">{field.displayName}</span>
          {complete ? (
            <>
              <span className="mx-1.5 text-success">✓</span>
              <span className="font-medium">{field.value}</span>
            </>
          ) : null}
        </p>
        {complete ? (
          <span className="shrink-0 text-[10px] text-muted-foreground">This issuance only</span>
        ) : (
          <Pill tone={required ? "danger" : "warning"}>{required ? "Required" : "Optional"}</Pill>
        )}
      </div>
      <TextInput
        fieldSize="compact"
        value={draftValue}
        onChange={(event) => onIssuanceChange(field.targetId, event.target.value)}
        placeholder={required ? "Required for this certificate" : "Optional for this certificate"}
        aria-label={field.displayName}
        className={
          complete
            ? ""
            : required
              ? "border-destructive/60"
              : "border-amber-500/70"
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground">
          {isCertificateFieldStudentSpecific(field.dataFieldId)
            ? "Student-specific · record is not changed"
            : "Applies to this certificate only · student record is not changed"}
        </p>
        {canApplyToAll && draftValue.trim() ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onApplyToAll(field.targetId, draftValue)}
          >
            Apply to all selected students
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function SharedIssuanceFields({
  mappings,
  draft,
  onDraftChange,
  onApplyField,
  onApplyAll,
}: {
  mappings: CertificateFieldMapping[];
  draft: Record<string, string>;
  onDraftChange: (targetId: string, value: string) => void;
  onApplyField: (targetId: string, value: string) => void;
  onApplyAll: () => void;
}) {
  const hasValue = mappings.some((mapping) => (draft[mapping.targetId] ?? "").trim());
  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Shared for this issuance</p>
        <p className="text-[11px] text-muted-foreground">
          Sport, event, and other common values can be applied to every selected student.
          Name, class, and results stay independent.
        </p>
      </div>
      {mappings.map((mapping) => (
        <Field
          key={mapping.targetId}
          label={mapping.displayName}
          hint={mapping.required ? "Required" : "Optional"}
        >
          <div className="flex flex-col gap-2 sm:flex-row">
            <TextInput
              fieldSize="compact"
              value={draft[mapping.targetId] ?? ""}
              onChange={(event) => onDraftChange(mapping.targetId, event.target.value)}
              placeholder={
                mapping.displayName === "Sport Name"
                  ? "Football"
                  : mapping.displayName.includes("Event")
                    ? "Annual Sports Meet 2026"
                    : mapping.displayName
              }
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!(draft[mapping.targetId] ?? "").trim()}
              onClick={() => onApplyField(mapping.targetId, draft[mapping.targetId] ?? "")}
            >
              Apply to all selected students
            </Button>
          </div>
        </Field>
      ))}
      <Button type="button" variant="primary" disabled={!hasValue} onClick={onApplyAll}>
        Apply all shared values to selected students
      </Button>
    </div>
  );
}

export function CertificateStudentPopulatePanel({
  template,
  institute,
  principalName,
  instituteId,
}: {
  template: CertificateTemplate;
  institute: DemoInstituteProfile;
  principalName?: string;
  instituteId?: string | null;
}) {
  const [students, setStudents] = useState<StudentDirectoryRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openStudentId, setOpenStudentId] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<CertificateIssuanceOverrides>({});
  const [sharedDraft, setSharedDraft] = useState<Record<string, string>>({});
  const [numberingRevision, setNumberingRevision] = useState(0);

  useEffect(() => {
    setStudents(loadStudentDirectory());
  }, []);

  useEffect(() => {
    return subscribeCertificateNumbering(() => setNumberingRevision((value) => value + 1));
  }, []);

  useEffect(() => {
    setOverrides({});
    setSharedDraft({});
  }, [template.id]);

  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? students.filter((student) => {
          const hay = [
            student.name,
            student.firstName,
            student.surname,
            student.grade,
            student.admissionNumber,
            student.rollNo,
            student.id,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        })
      : students;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [students, query]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.has(student.id)),
    [students, selectedIds],
  );

  const fills = useMemo<StudentFill[]>(() => {
    const previewNumbers = peekCertificateNumbers(selectedStudents.length);
    return selectedStudents.map((student, index) => {
      const auto = populateCertificateMappings(
        template.mappings,
        certificatePopulateContextForStudent({
          student,
          institute,
          principalName,
        }),
      );
      const populated = applyCertificateIssuanceOverrides(
        template.mappings,
        auto,
        overrides[student.id],
      );
      const fields = applyCertificateNumberToFields(
        populated,
        previewNumbers[index] ?? "",
      );
      const requiredMissing = fields.filter(
        (field) =>
          field.status === "required-missing" && !isCertificateNumberDataField(field.dataFieldId),
      ).length;
      const optionalMissing = fields.filter(
        (field) =>
          field.status === "optional-missing" && !isCertificateNumberDataField(field.dataFieldId),
      ).length;
      return {
        student,
        fields,
        requiredMissing,
        optionalMissing,
        ready: certificateRequiredFieldsComplete(fields),
      };
    });
  }, [selectedStudents, template.mappings, institute, principalName, overrides, numberingRevision]);

  const sharedMappings = useMemo(() => {
    const candidates = template.mappings.filter(
      (mapping) => !isCertificateFieldStudentSpecific(mapping.dataFieldId),
    );
    if (fills.length === 0) return candidates;
    return candidates.filter((mapping) =>
      fills.some((row) => {
        const field = row.fields.find((item) => item.targetId === mapping.targetId);
        return field?.source !== "record";
      }),
    );
  }, [template.mappings, fills]);

  useEffect(() => {
    if (fills.length === 0) {
      setOpenStudentId(null);
      return;
    }
    setOpenStudentId((current) =>
      current && fills.some((row) => row.student.id === current)
        ? current
        : fills[0]?.student.id ?? null,
    );
  }, [fills]);

  const blockedCount = fills.filter((row) => !row.ready).length;
  const canIssue = fills.length > 0 && blockedCount === 0;
  const batchSelected = selectedStudents.length >= 2;
  const selectedIdList = selectedStudents.map((student) => student.id);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const student of visibleStudents) next.add(student.id);
      return next;
    });
  };

  const clearSelected = () => setSelectedIds(new Set());

  const setIssuanceValue = (studentId: string, targetId: string, value: string) => {
    setOverrides((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] ?? {}),
        [targetId]: value,
      },
    }));
  };

  const applyToAllSelected = (targetId: string, value: string) => {
    setOverrides((prev) =>
      copyCertificateIssuanceValue(prev, selectedIdList, targetId, value),
    );
  };

  const applyAllShared = () => {
    setOverrides((prev) => {
      let next = prev;
      for (const mapping of sharedMappings) {
        const value = (sharedDraft[mapping.targetId] ?? "").trim();
        if (!value) continue;
        next = copyCertificateIssuanceValue(next, selectedIdList, mapping.targetId, value);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader
        title="Select students"
        hint="Each student is filled independently · shared event values can be applied to the whole selection"
      />
      <CardBody className="space-y-4">
        {template.mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This published template has no field mappings yet.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-[12rem] flex-1">
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, class, admission no."
            />
          </div>
          <Button size="sm" variant="outline" onClick={selectVisible} disabled={visibleStudents.length === 0}>
            Select visible
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelected} disabled={selectedIds.size === 0}>
            Clear
          </Button>
        </div>

        {visibleStudents.length === 0 ? (
          <EmptyState
            icon={<Users className="size-5" />}
            title="No students"
            hint="Add students in the Students directory first."
          />
        ) : (
          <ul className="max-h-72 overflow-y-auto divide-y divide-border rounded-lg border border-border">
            {visibleStudents.map((student) => {
              const checked = selectedIds.has(student.id);
              return (
                <li key={student.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(student.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{student.name}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {student.grade}
                        {student.admissionNumber ? ` · ${student.admissionNumber}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          {selectedIds.size} selected
          {fills.length > 0
            ? ` · ${fills.reduce((sum, row) => sum + row.requiredMissing, 0)} required empty · ${fills.reduce((sum, row) => sum + row.optionalMissing, 0)} optional empty`
            : ""}
        </p>

        {batchSelected && sharedMappings.length > 0 ? (
          <SharedIssuanceFields
            mappings={sharedMappings}
            draft={sharedDraft}
            onDraftChange={(targetId, value) =>
              setSharedDraft((prev) => ({ ...prev, [targetId]: value }))
            }
            onApplyField={applyToAllSelected}
            onApplyAll={applyAllShared}
          />
        ) : null}

        {fills.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Select one or more students to populate mapped fields.
          </p>
        ) : (
          <ul className="space-y-3">
            {fills.map((row) => {
              const open = openStudentId === row.student.id;
              return (
                <li key={row.student.id} className="rounded-lg border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"
                    onClick={() =>
                      setOpenStudentId((current) =>
                        current === row.student.id ? null : row.student.id,
                      )
                    }
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{row.student.name}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {row.student.grade}
                        {row.requiredMissing
                          ? ` · ${row.requiredMissing} required empty`
                          : row.optionalMissing
                            ? ` · ${row.optionalMissing} optional empty`
                            : " · all mapped fields filled"}
                      </span>
                    </span>
                    <Pill
                      tone={
                        row.requiredMissing ? "danger" : row.optionalMissing ? "warning" : "success"
                      }
                    >
                      {row.requiredMissing
                        ? "Required"
                        : row.optionalMissing
                          ? "Optional"
                          : "Ready"}
                    </Pill>
                  </button>
                  {open ? (
                    <ul className="border-t border-border px-3">
                      {row.fields.map((field) => (
                        <FieldRow
                          key={field.targetId}
                          field={field}
                          draftValue={overrides[row.student.id]?.[field.targetId] ?? ""}
                          canApplyToAll={
                            batchSelected &&
                            !isCertificateFieldStudentSpecific(field.dataFieldId) &&
                            field.source !== "record"
                          }
                          onIssuanceChange={(targetId, value) =>
                            setIssuanceValue(row.student.id, targetId, value)
                          }
                          onApplyToAll={applyToAllSelected}
                        />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {fills.length > 0 ? (
          <CertificateIssueActions
            template={template}
            canIssue={canIssue}
            blockedCount={blockedCount}
            instituteId={instituteId}
            rows={fills.map((row) => ({
              studentId: row.student.id,
              studentName: row.student.name,
              admissionNumber: row.student.admissionNumber,
              fields: row.fields,
            }))}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
