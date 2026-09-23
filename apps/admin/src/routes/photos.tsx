import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImagePlus, Search, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { isApiAuthMode } from "@/auth/auth-mode";
import { adminPageTitle } from "@/lib/admin-module-labels";
import { adminModulePrefix, adminQueryKeys, adminQueryRoots } from "@/lib/admin-queries/keys";
import { listSections, listClasses } from "@/lib/classes/api";
import {
  listPhotoStudents,
  listPhotoTeachers,
  uploadStudentPhoto,
  uploadTeacherPhoto,
  type PhotoStudentDto,
  type PhotoTeacherDto,
} from "@/lib/photos/api";
import { invalidateTeachersListCache } from "@/lib/teachers/load";
import { invalidateStudentsListCache } from "@/lib/students/load";
import {
  PhotoCaptureCancelledError,
  PhotoPermissionDeniedError,
  pickGalleryPhoto,
  takeDevicePhoto,
} from "@/lib/photos/capture";
import { ApiClientError } from "@/lib/api/errors";
import { profilePhotoCompressLabel } from "@lumenx/utils";

export const Route = createFileRoute("/photos")({
  head: () => ({ meta: [{ title: adminPageTitle("/photos") }] }),
  component: PhotosPage,
});

type Mode = "staff" | "student";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function PhotoThumb({
  url,
  name,
  size = "md",
}: {
  url: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg" ? "h-28 w-28 text-2xl" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${dim} rounded-full object-cover border border-border bg-muted`}
      />
    );
  }
  return (
    <div
      className={`${dim} rounded-full bg-muted text-muted-foreground flex items-center justify-center font-semibold border border-border`}
    >
      {initials(name)}
    </div>
  );
}

function PhotosPage() {
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const instituteId = instituteCtx.activeInstituteId;
  const toast = useAdminToast();
  const qc = useQueryClient();

  const [mode, setMode] = useState<Mode>("staff");
  const [q, setQ] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const teachersQuery = useQuery({
    queryKey: adminQueryKeys.photosTeachers(instituteId ?? "", q),
    enabled: apiMode && Boolean(instituteId) && mode === "staff",
    queryFn: () => listPhotoTeachers({ instituteId: instituteId!, q }),
  });

  const classesQuery = useQuery({
    queryKey: [...adminQueryKeys.classes(instituteId ?? ""), "for-photos"],
    enabled: apiMode && Boolean(instituteId) && mode === "student",
    queryFn: () => listClasses({ instituteId: instituteId! }),
  });

  const sectionsQuery = useQuery({
    queryKey: [...adminQueryKeys.classes(instituteId ?? ""), "sections", classId],
    enabled: apiMode && Boolean(instituteId) && mode === "student" && Boolean(classId),
    queryFn: () => listSections({ instituteId: instituteId!, classId }),
  });

  const studentsQuery = useQuery({
    queryKey: adminQueryKeys.photosStudents(
      instituteId ?? "",
      classId,
      sectionId,
      q,
    ),
    enabled:
      apiMode &&
      Boolean(instituteId) &&
      mode === "student" &&
      Boolean(classId) &&
      Boolean(sectionId),
    queryFn: () =>
      listPhotoStudents({
        instituteId: instituteId!,
        classId,
        sectionId,
        q,
      }),
  });

  const teachers = teachersQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const selectedTeacher =
    teachers.find((t) => t.id === selectedTeacherId) ?? null;
  const selectedStudent =
    students.find((s) => s.id === selectedStudentId) ?? null;

  const classOptions = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const sectionOptions = useMemo(
    () => sectionsQuery.data ?? [],
    [sectionsQuery.data],
  );

  async function invalidateAfterUpload() {
    if (!instituteId) return;
    invalidateTeachersListCache(instituteId);
    invalidateStudentsListCache(instituteId);
    await Promise.all([
      qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.photos) }),
      qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.teachers) }),
      qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.students) }),
    ]);
  }

  async function runUpload(
    kind: "gallery" | "camera",
    target: { type: "teacher"; row: PhotoTeacherDto } | { type: "student"; row: PhotoStudentDto },
  ) {
    setBusy(true);
    setStatusMsg(kind === "camera" ? "Opening camera…" : "Opening gallery…");
    try {
      const raw =
        kind === "camera" ? await takeDevicePhoto() : await pickGalleryPhoto();
      setStatusMsg("Uploading photo…");
      const result =
        target.type === "teacher"
          ? await uploadTeacherPhoto(target.row.id, raw)
          : await uploadStudentPhoto(target.row.id, raw);
      setStatusMsg("Photo saved");
      toast(`Photo updated for ${target.row.displayName}`, "success");
      await invalidateAfterUpload();
      if (target.type === "teacher") {
        setSelectedTeacherId(result.person.id);
      } else {
        setSelectedStudentId(result.person.id);
      }
    } catch (err) {
      if (err instanceof PhotoCaptureCancelledError) {
        setStatusMsg(null);
        return;
      }
      if (err instanceof PhotoPermissionDeniedError) {
        toast("Camera permission denied", "error");
        setStatusMsg("Camera permission denied");
        return;
      }
      const message =
        err instanceof ApiClientError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Upload failed";
      toast(message, "error");
      setStatusMsg(message);
    } finally {
      setBusy(false);
    }
  }

  if (!apiMode) {
    return (
      <AppShell title="Photos" subtitle="Profile photo management">
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Photos require API auth mode with a live institute.
        </div>
      </AppShell>
    );
  }

  if (!instituteId) {
    return (
      <AppShell title="Photos" subtitle="Profile photo management">
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Select an institute to manage profile photos.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Photos"
      subtitle={`Assign staff and student profile photos · ${profilePhotoCompressLabel()}`}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            mode === "staff"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border"
          }`}
          onClick={() => {
            setMode("staff");
            setSelectedStudentId(null);
            setStatusMsg(null);
          }}
        >
          Staff / Teacher
        </button>
        <button
          type="button"
          className={`rounded-lg px-3 py-2 text-sm font-medium border ${
            mode === "student"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card border-border"
          }`}
          onClick={() => {
            setMode("student");
            setSelectedTeacherId(null);
            setStatusMsg(null);
          }}
        >
          Student
        </button>
      </div>

      {mode === "student" && (
        <div className="grid gap-3 sm:grid-cols-2 mb-4">
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Class</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setSelectedStudentId(null);
              }}
            >
              <option value="">Select class</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.code || c.id}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-muted-foreground">Section</span>
            <select
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              value={sectionId}
              disabled={!classId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setSelectedStudentId(null);
              }}
            >
              <option value="">Select section</option>
              {sectionOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code || s.name || s.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm"
          placeholder={mode === "staff" ? "Search staff…" : "Search students…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {statusMsg && (
        <p className="mb-3 text-sm text-muted-foreground">{statusMsg}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {mode === "staff" && teachersQuery.isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Loading staff…</p>
          )}
          {mode === "staff" && teachersQuery.isError && (
            <p className="p-4 text-sm text-destructive">
              {(teachersQuery.error as Error).message || "Failed to load staff"}
            </p>
          )}
          {mode === "staff" && !teachersQuery.isLoading && teachers.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No staff found.</p>
          )}
          {mode === "staff" &&
            teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/40 ${
                  selectedTeacherId === t.id ? "bg-muted/60" : ""
                }`}
                onClick={() => setSelectedTeacherId(t.id)}
              >
                <PhotoThumb url={t.photoSignedUrl} name={t.displayName} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{t.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {t.department}
                    {t.phone ? ` · ${t.phone}` : ""}
                  </div>
                </div>
              </button>
            ))}

          {mode === "student" && (!classId || !sectionId) && (
            <p className="p-4 text-sm text-muted-foreground">
              Select class and section to load students.
            </p>
          )}
          {mode === "student" && classId && sectionId && studentsQuery.isLoading && (
            <p className="p-4 text-sm text-muted-foreground">Loading students…</p>
          )}
          {mode === "student" && studentsQuery.isError && (
            <p className="p-4 text-sm text-destructive">
              {(studentsQuery.error as Error).message || "Failed to load students"}
            </p>
          )}
          {mode === "student" &&
            classId &&
            sectionId &&
            !studentsQuery.isLoading &&
            students.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No students in this section.</p>
            )}
          {mode === "student" &&
            students.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border last:border-0 hover:bg-muted/40 ${
                  selectedStudentId === s.id ? "bg-muted/60" : ""
                }`}
                onClick={() => setSelectedStudentId(s.id)}
              >
                <PhotoThumb url={s.photoSignedUrl} name={s.displayName} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{s.displayName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.classLabel, s.sectionLabel].filter(Boolean).join(" · ")}
                    {s.rollNo ? ` · Roll ${s.rollNo}` : ""}
                  </div>
                </div>
              </button>
            ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 space-y-4 h-fit">
          {mode === "staff" && !selectedTeacher && (
            <p className="text-sm text-muted-foreground">Select a staff member.</p>
          )}
          {mode === "student" && !selectedStudent && (
            <p className="text-sm text-muted-foreground">Select a student.</p>
          )}

          {selectedTeacher && (
            <>
              <div className="flex flex-col items-center gap-3">
                <PhotoThumb
                  url={selectedTeacher.photoSignedUrl}
                  name={selectedTeacher.displayName}
                  size="lg"
                />
                <div className="text-center">
                  <div className="font-semibold">{selectedTeacher.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedTeacher.department}
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() =>
                    void runUpload("gallery", {
                      type: "teacher",
                      row: selectedTeacher,
                    })
                  }
                >
                  <Upload className="h-4 w-4" />
                  Upload Photo
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() =>
                    void runUpload("camera", {
                      type: "teacher",
                      row: selectedTeacher,
                    })
                  }
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
              </div>
            </>
          )}

          {selectedStudent && (
            <>
              <div className="flex flex-col items-center gap-3">
                <PhotoThumb
                  url={selectedStudent.photoSignedUrl}
                  name={selectedStudent.displayName}
                  size="lg"
                />
                <div className="text-center">
                  <div className="font-semibold">{selectedStudent.displayName}</div>
                  <div className="text-xs text-muted-foreground">
                    {[selectedStudent.classLabel, selectedStudent.sectionLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </div>
              <div className="grid gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() =>
                    void runUpload("gallery", {
                      type: "student",
                      row: selectedStudent,
                    })
                  }
                >
                  <ImagePlus className="h-4 w-4" />
                  Upload Photo
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium disabled:opacity-50"
                  onClick={() =>
                    void runUpload("camera", {
                      type: "student",
                      row: selectedStudent,
                    })
                  }
                >
                  <Camera className="h-4 w-4" />
                  Take Photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
