import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Modal,
  PageStack,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import {
  deleteSection,
  loadSectionDetail,
  resolveSectionDetailView,
  shouldCommitClassesLoad,
  updateClass,
  updateSection,
  type ClassesListStatus,
  type ClassStatus,
  type SectionDetailItem,
  type SectionStatus,
} from "@/lib/classes";
import { SectionRosterPanel } from "@/components/classes/SectionRosterPanel";
import { SectionTeachersPanel } from "@/components/classes/SectionTeachersPanel";

function detailHint(status: ClassesListStatus, errorMessage: string | null): string | null {
  if (status === "loading") return "Loading class section…";
  if (status === "needs_institute") return "Select an institute to load this class section.";
  if (status === "forbidden") {
    return errorMessage ?? "You do not have access to this section.";
  }
  if (status === "error") return errorMessage ?? "Failed to load class section.";
  if (status === "empty") return errorMessage ?? "Section not found.";
  return null;
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-xs font-medium leading-relaxed">{value?.trim() || "—"}</div>
    </div>
  );
}

export function ClassSectionApiPage({ sectionId }: { sectionId: string }) {
  const notify = useAdminToast();
  const navigate = useNavigate();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const [section, setSection] = useState<SectionDetailItem | null>(null);
  const [status, setStatus] = useState<ClassesListStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("0");
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>("active");
  const [classStatus, setClassStatus] = useState<ClassStatus>("active");

  const detailView = resolveSectionDetailView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedSection: section,
    storedStatus: status,
    storedErrorMessage: errorMessage,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setSection(null);
      setStatus("loading");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setSection(null);
      setStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setErrorMessage(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setSection(null);
      setStatus("needs_institute");
      setErrorMessage(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setSection(null);
    setStatus("loading");
    setErrorMessage(null);
    void loadSectionDetail(sectionId, requestInstituteId).then((next) => {
      if (
        !shouldCommitClassesLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setSection(next.section);
      setStatus(next.status);
      setErrorMessage(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      if (next.section) {
        setRoom(next.section.room === "—" ? "" : next.section.room);
        setCapacity(String(next.section.capacity ?? 0));
        setSectionStatus(next.section.sectionStatus);
        setClassStatus(next.section.classStatus);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    sectionId,
    reloadKey,
  ]);

  const hint = detailHint(detailView.status, detailView.errorMessage);
  const displaySection = detailView.detailValid ? detailView.section : null;

  const saveSection = () => {
    if (!writesEnabled || !displaySection) return;
    setSaving(true);
    const tasks: Promise<unknown>[] = [
      updateSection(sectionId, {
        room: room.trim() || null,
        capacity: Number(capacity) || 0,
        status: sectionStatus,
      }),
    ];
    if (classStatus !== displaySection.classStatus) {
      tasks.push(updateClass(displaySection.classId, { status: classStatus }));
    }
    void Promise.all(tasks)
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Section updated");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to update section");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const removeSection = () => {
    if (!writesEnabled) return;
    setDeleting(true);
    void deleteSection(sectionId)
      .then(() => {
        setConfirmDelete(false);
        notify("Section deleted");
        void navigate({ to: "/classes" });
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to delete section");
      })
      .finally(() => {
        setDeleting(false);
      });
  };

  return (
    <AppShell
      title={displaySection?.name ?? "Class section"}
      subtitle={
        writesEnabled
          ? "API mode · section catalog record"
          : "API mode · read-only · select an institute to edit"
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {displaySection && writesEnabled ? (
            <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-3.5" /> Delete section
            </Button>
          ) : null}
          <Link to="/classes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-3.5" /> Back to classes
            </Button>
          </Link>
        </div>
      }
    >
      <PageStack>
        {detailView.status !== "ready" || !displaySection ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">{hint ?? "Loading…"}</Card>
        ) : (
          <>
            <Card>
              <CardHeader
                title={displaySection.name}
                hint={`Class ${displaySection.classCode} · Section ${displaySection.section}`}
                action={
                  <div className="flex flex-wrap gap-2">
                    <Pill tone={displaySection.sectionStatus === "active" ? "success" : "neutral"}>
                      {displaySection.sectionStatus}
                    </Pill>
                    <Pill tone={displaySection.classStatus === "active" ? "success" : "neutral"}>
                      class {displaySection.classStatus}
                    </Pill>
                  </div>
                }
              />
              <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
                <DetailField label="Timetable grade" value={displaySection.timetableGrade} />
                <DetailField label="Room" value={displaySection.room} />
                <DetailField label="Capacity" value={String(displaySection.capacity)} />
                <DetailField label="Students" value={String(displaySection.students)} />
                <DetailField label="Teachers" value={displaySection.teacher} />
                <DetailField
                  label="Academic year id"
                  value={displaySection.academicYearId.slice(0, 8) + "…"}
                />
                <DetailField
                  label="Last updated"
                  value={new Date(displaySection.updatedAt).toLocaleString()}
                />
              </div>
            </Card>
            {writesEnabled ? (
              <Card>
                <CardHeader title="Edit section" hint="PATCH /sections/:id · class status via PATCH /classes/:id" />
                <div className="grid gap-4 px-4 pb-5 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
                  <Field label="Room">
                    <TextInput value={room} onChange={(e) => setRoom(e.target.value)} />
                  </Field>
                  <Field label="Capacity">
                    <TextInput
                      type="number"
                      min={0}
                      value={capacity}
                      onChange={(e) => setCapacity(e.target.value)}
                    />
                  </Field>
                  <Field label="Section status">
                    <Select
                      value={sectionStatus}
                      onChange={(e) => setSectionStatus(e.target.value as SectionStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </Field>
                  <Field label="Class status">
                    <Select
                      value={classStatus}
                      onChange={(e) => setClassStatus(e.target.value as ClassStatus)}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </Select>
                  </Field>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Button variant="primary" onClick={saveSection} disabled={saving}>
                      {saving ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              </Card>
            ) : null}
            <SectionRosterPanel
              section={displaySection}
              writesEnabled={writesEnabled}
              onChanged={() => setReloadKey((k) => k + 1)}
              notify={notify}
            />
            <SectionTeachersPanel
              section={displaySection}
              writesEnabled={writesEnabled}
              onChanged={() => setReloadKey((k) => k + 1)}
              notify={notify}
            />
          </>
        )}
      </PageStack>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete section?"
        footer={
          <>
            <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="primary" onClick={removeSection} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Soft-deletes this section for the active institute. Existing enrollments may block the
          request if the backend enforces them.
        </p>
      </Modal>
    </AppShell>
  );
}
