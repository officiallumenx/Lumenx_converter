import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  resolveSectionDetailView,
  updateClass,
  updateSection,
  type ClassesListStatus,
  type ClassStatus,
  type SectionStatus,
} from "@/lib/classes";
import { listTeachersForSectionPicker } from "@/lib/classes/section-teachers";
import { SectionRosterPanel } from "@/components/classes/SectionRosterPanel";
import { SectionTeachersPanel } from "@/components/classes/SectionTeachersPanel";
import {
  useClassSectionDetailQuery,
  adminModulePrefix,
  adminQueryRoots,
} from "@/lib/admin-queries";

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
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const detailEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const detailQuery = useClassSectionDetailQuery(
    instituteCtx.activeInstituteId,
    sectionId,
    detailEnabled,
  );

  const section = detailQuery.data?.section ?? null;
  const status: ClassesListStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : detailQuery.isLoading && !detailQuery.data
              ? "loading"
              : (detailQuery.data?.status ?? "loading");
  const errorMessage =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (detailQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    detailQuery.data && detailEnabled ? instituteCtx.activeInstituteId : null;

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [room, setRoom] = useState("");
  const [capacity, setCapacity] = useState("0");
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>("active");
  const [classStatus, setClassStatus] = useState<ClassStatus>("active");
  const [classTeacherId, setClassTeacherId] = useState("");
  const [teacherOptions, setTeacherOptions] = useState<Array<{ id: string; label: string }>>(
    [],
  );

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
    if (!detailEnabled || !instituteCtx.activeInstituteId) {
      setTeacherOptions([]);
      return;
    }
    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    void listTeachersForSectionPicker(requestInstituteId)
      .catch(() => [] as Array<{ id: string; label: string }>)
      .then((teachers) => {
        if (cancelled) return;
        if (instituteCtx.activeInstituteId !== requestInstituteId) return;
        setTeacherOptions(teachers);
      });
    return () => {
      cancelled = true;
    };
  }, [detailEnabled, instituteCtx.activeInstituteId]);

  useEffect(() => {
    if (!section) return;
    setRoom(section.room === "—" ? "" : section.room);
    setCapacity(String(section.capacity ?? 0));
    setSectionStatus(section.sectionStatus);
    setClassStatus(section.classStatus);
    setClassTeacherId(section.classTeacherId ?? "");
  }, [section]);

  const invalidateClassCaches = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.classSection),
    });
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.classes),
    });
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.catalog),
    });
  };

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
        classTeacherId: classTeacherId.trim() || null,
      }),
    ];
    if (classStatus !== displaySection.classStatus) {
      tasks.push(updateClass(displaySection.classId, { status: classStatus }));
    }
    void Promise.all(tasks)
      .then(() => {
        invalidateClassCaches();
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
        invalidateClassCaches();
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
          ? "Section catalog record"
          : "Read-only · select an institute to edit"
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
                <DetailField label="Subject teachers" value={displaySection.teacher} />
                <DetailField
                  label="Class teacher"
                  value={
                    teacherOptions.find((t) => t.id === displaySection.classTeacherId)?.label ??
                    (displaySection.classTeacherId
                      ? displaySection.classTeacherId.slice(0, 8) + "…"
                      : "—")
                  }
                />
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
                <CardHeader title="Edit section" hint="Update section and class status" />
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
                  <Field label="Class teacher (homeroom)">
                    <Select
                      value={classTeacherId}
                      onChange={(e) => setClassTeacherId(e.target.value)}
                    >
                      <option value="">— Not assigned —</option>
                      {teacherOptions.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.label}
                        </option>
                      ))}
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
              onChanged={invalidateClassCaches}
              notify={notify}
            />
            <SectionTeachersPanel
              section={displaySection}
              writesEnabled={writesEnabled}
              onChanged={invalidateClassCaches}
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
