import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardHeader,
  Field,
  PageStack,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { Wand2 } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  createGeneratedDocument,
  loadDocumentsTemplatesList,
  shouldCommitDocumentsTemplatesLoad,
} from "@/lib/documents";
import { listStudents, studentDtosToListItems } from "@/lib/students";
import type { StudentListItem } from "@/lib/students";
import type { TemplateRecord } from "@/lib/template-management/types";

/**
 * API-mode generate — creates a generated_document draft from an active template.
 * Does not port the demo multi-step wizard / local PDF preview.
 */
export function DocGenerateApiPanel() {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [loadHint, setLoadHint] = useState<string | null>("Loading…");
  const [templateId, setTemplateId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientRef, setRecipientRef] = useState("");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const activeRef = useRef(instituteCtx.activeInstituteId);
  activeRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (
      instituteCtx.status !== "ready" ||
      !instituteCtx.activeInstituteId
    ) {
      setTemplates([]);
      setStudents([]);
      setLoadHint(
        instituteCtx.status === "loading"
          ? "Loading…"
          : "Select an institute to generate documents.",
      );
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadHint("Loading templates and students…");
    void Promise.all([
      loadDocumentsTemplatesList(requestInstituteId),
      listStudents({ instituteId: requestInstituteId })
        .then((dtos) => studentDtosToListItems(dtos))
        .catch(() => [] as StudentListItem[]),
    ]).then(([tplState, studentRows]) => {
      if (
        !shouldCommitDocumentsTemplatesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeRef.current,
        })
      ) {
        return;
      }
      if (tplState.status === "forbidden" || tplState.status === "error") {
        setTemplates([]);
        setStudents([]);
        setLoadHint(tplState.errorMessage ?? "Failed to load templates");
        return;
      }
      const active = tplState.items.filter(
        (t) =>
          t.status === "active" &&
          (t.kind === "document" ||
            t.kind === "certificate" ||
            t.kind === "report" ||
            t.kind === "id_card"),
      );
      setTemplates(active);
      setStudents(studentRows);
      setLoadHint(
        active.length === 0
          ? "No active templates. Activate a template first."
          : null,
      );
      if (active.length > 0 && !templateId) {
        setTemplateId(active[0].id);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reload on institute gate
  }, [instituteCtx.status, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!studentId) return;
    const s = students.find((row) => row.id === studentId);
    if (s) {
      setRecipientName(s.displayName);
      setRecipientRef(s.admissionNumber ?? s.id);
    }
  }, [studentId, students]);

  const submit = () => {
    if (!writesEnabled || submitting) return;
    const instituteId = instituteCtx.activeInstituteId;
    if (!instituteId) {
      notify("Select an institute first");
      return;
    }
    if (!isInstituteUuid(templateId)) {
      notify("Select a valid template");
      return;
    }
    if (!recipientName.trim()) {
      notify("Recipient name is required");
      return;
    }
    if (studentId && !isInstituteUuid(studentId)) {
      notify("Invalid student id");
      return;
    }

    const tpl = templates.find((t) => t.id === templateId);
    setSubmitting(true);
    void createGeneratedDocument({
      instituteId,
      templateId,
      title: title.trim() || tpl?.name || "Document",
      studentId: studentId || null,
      recipientName: recipientName.trim(),
      recipientRef: recipientRef.trim() || null,
    })
      .then(() => {
        notify("Document generated as draft");
        void navigate({ to: "/documents", search: { view: "generated" } });
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to generate document");
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <PageStack>
      <Card className="max-w-2xl">
        <CardHeader
          title="Generate document"
          hint="POST /api/v1/documents/generated · creates a draft for workflow review"
        />
        <div className="space-y-4 px-5 pb-5">
          {loadHint ? (
            <p className="text-sm text-muted-foreground">{loadHint}</p>
          ) : null}
          {!writesEnabled ? (
            <p className="text-sm text-muted-foreground">
              Select an active institute to generate documents.
            </p>
          ) : null}
          <Field label="Template" required>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={!writesEnabled || templates.length === 0}
            >
              {templates.length === 0 ? (
                <option value="">No active templates</option>
              ) : (
                templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.kind})
                  </option>
                ))
              )}
            </Select>
          </Field>
          <Field label="Student (optional)">
            <Select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={!writesEnabled}
            >
              <option value="">Manual recipient</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                  {s.classLabel ? ` · ${s.classLabel}` : ""}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Recipient name" required>
            <TextInput
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              disabled={!writesEnabled}
              placeholder="Full name on the document"
            />
          </Field>
          <Field label="Recipient ref">
            <TextInput
              value={recipientRef}
              onChange={(e) => setRecipientRef(e.target.value)}
              disabled={!writesEnabled}
              placeholder="Admission no. / employee id"
            />
          </Field>
          <Field label="Title override">
            <TextInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!writesEnabled}
              placeholder="Defaults to template name"
            />
          </Field>
          <Button
            variant="primary"
            disabled={!writesEnabled || submitting || templates.length === 0}
            onClick={submit}
          >
            <Wand2 className="size-3.5" /> Generate draft
          </Button>
        </div>
      </Card>
    </PageStack>
  );
}
