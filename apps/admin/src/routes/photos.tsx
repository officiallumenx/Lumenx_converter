import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Upload } from "lucide-react";
import { PersonPhotoPreview } from "@lumenx/ui";
import {
  Button,
  Card,
  PageStack,
  Pill,
  SearchInput,
  Select,
} from "@lumenx/ui-admin";
import { AppShell } from "@/components/AppShell";
import { ModuleHero } from "@/components/module-shell";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { isApiAuthMode } from "@/auth/auth-mode";
import { ADMIN_MODULE_LABELS as M, adminPageTitle } from "@/lib/admin-module-labels";
import { adminModulePrefix, adminQueryKeys, adminQueryRoots } from "@/lib/admin-queries/keys";
import { useCatalogClassesQuery } from "@/lib/admin-queries";
import {
  buildStudentAttendanceApiClassOptions,
  buildStudentAttendanceApiSectionOptions,
} from "@/lib/attendance/class-section-options";
import { normalizeSchoolClassName } from "@/lib/classes/name-format";
import {
  listPhotoDrivers,
  listPhotoStudents,
  listPhotoTeachers,
  uploadDriverPhoto,
  uploadStudentPhoto,
  uploadTeacherPhoto,
  type PhotoDriverDto,
  type PhotoSignedUrlDto,
  type PhotoStudentDto,
  type PhotoTeacherDto,
} from "@/lib/photos/api";
import {
  isSignedPhotoUrlUsable,
  photoListStaleTimeMs,
} from "@/lib/photos/signed-url";
import { invalidateTeachersListCache } from "@/lib/teachers/load";
import { invalidateStudentsListCache } from "@/lib/students/load";
import {
  PhotoCaptureCancelledError,
  PhotoPermissionDeniedError,
  pickGalleryPhoto,
  takeDevicePhoto,
} from "@/lib/photos/capture";
import { ApiClientError } from "@/lib/api/errors";

export const Route = createFileRoute("/photos")({
  head: () => ({ meta: [{ title: adminPageTitle("/photos") }] }),
  component: PhotosPage,
});

type Mode = "staff" | "student" | "driver";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function PhotoThumb({
  url,
  expiresAt,
  name,
  size = "md",
}: {
  url: string | null;
  expiresAt?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const src = isSignedPhotoUrlUsable(url, expiresAt) ? url : null;
  const dim =
    size === "lg" ? "h-28 w-28 text-2xl" : size === "sm" ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";
  if (src) {
    return (
      <PersonPhotoPreview src={src} title={name} alt={name} className="shrink-0 rounded-full">
        <img
          src={src}
          alt={name}
          loading="lazy"
          decoding="async"
          className={`${dim} rounded-full object-cover border border-border bg-muted pointer-events-none`}
        />
      </PersonPhotoPreview>
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

function FilterField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0 text-xs" htmlFor={id}>
      <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatStudentScope(classLabel: string | null, sectionLabel: string | null): string {
  const cls = classLabel?.trim()
    ? normalizeSchoolClassName(classLabel) || classLabel.trim()
    : "";
  const sec = sectionLabel?.trim() ? sectionLabel.trim().toUpperCase() : "";
  if (cls && sec) return `${cls} · Sec ${sec}`;
  if (cls) return cls;
  if (sec) return `Sec ${sec}`;
  return "";
}

function PersonPhotoActions({
  busy,
  onGallery,
  onCamera,
}: {
  busy: boolean;
  onGallery: () => void;
  onCamera: () => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 pt-1">
      <Button
        variant="primary"
        disabled={busy}
        className="w-full gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onGallery();
        }}
      >
        <Upload className="size-3.5 shrink-0" />
        Upload photo
      </Button>
      <Button
        variant="outline"
        disabled={busy}
        className="w-full gap-2"
        onClick={(e) => {
          e.stopPropagation();
          onCamera();
        }}
      >
        <Camera className="size-3.5 shrink-0" />
        Take photo
      </Button>
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
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const teachersQuery = useQuery({
    queryKey: adminQueryKeys.photosTeachers(instituteId ?? "", q),
    enabled: apiMode && Boolean(instituteId) && mode === "staff",
    queryFn: () => listPhotoTeachers({ instituteId: instituteId!, q }),
    staleTime: (query) => photoListStaleTimeMs(query.state.data),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
  });

  const driversQuery = useQuery({
    queryKey: adminQueryKeys.photosDrivers(instituteId ?? "", q),
    enabled: apiMode && Boolean(instituteId) && mode === "driver",
    queryFn: () => listPhotoDrivers({ instituteId: instituteId!, q }),
    staleTime: (query) => photoListStaleTimeMs(query.state.data),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
  });

  const catalogQuery = useCatalogClassesQuery(
    instituteId,
    apiMode && Boolean(instituteId) && mode === "student",
  );

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
    staleTime: (query) => photoListStaleTimeMs(query.state.data),
    placeholderData: keepPreviousData,
    refetchOnMount: true,
  });

  const teachers = teachersQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const students = studentsQuery.data ?? [];

  // Seed per-person signed-url cache from list payloads so other screens reuse them.
  useEffect(() => {
    for (const t of teachers) {
      if (!isSignedPhotoUrlUsable(t.photoSignedUrl, t.photoExpiresAt)) continue;
      const payload: PhotoSignedUrlDto = {
        kind: "teacher",
        id: t.id,
        photoAssetPath: t.photoAssetPath,
        photoSignedUrl: t.photoSignedUrl,
        photoExpiresAt: t.photoExpiresAt,
      };
      qc.setQueryData(adminQueryKeys.photosSignedUrl("teacher", t.id), payload);
    }
  }, [qc, teachers]);

  useEffect(() => {
    for (const d of drivers) {
      if (!isSignedPhotoUrlUsable(d.photoSignedUrl, d.photoExpiresAt)) continue;
      const payload: PhotoSignedUrlDto = {
        kind: "driver",
        id: d.id,
        photoAssetPath: d.photoAssetPath,
        photoSignedUrl: d.photoSignedUrl,
        photoExpiresAt: d.photoExpiresAt,
      };
      qc.setQueryData(adminQueryKeys.photosSignedUrl("driver", d.id), payload);
    }
  }, [qc, drivers]);

  useEffect(() => {
    for (const s of students) {
      if (!isSignedPhotoUrlUsable(s.photoSignedUrl, s.photoExpiresAt)) continue;
      const payload: PhotoSignedUrlDto = {
        kind: "student",
        id: s.id,
        photoAssetPath: s.photoAssetPath,
        photoSignedUrl: s.photoSignedUrl,
        photoExpiresAt: s.photoExpiresAt,
      };
      qc.setQueryData(adminQueryKeys.photosSignedUrl("student", s.id), payload);
    }
  }, [qc, students]);

  const classOptions = useMemo(
    () => buildStudentAttendanceApiClassOptions(catalogQuery.data?.classes ?? []),
    [catalogQuery.data],
  );
  const sectionOptions = useMemo(() => {
    const classes = catalogQuery.data?.classes ?? [];
    const sections = catalogQuery.data?.sections ?? [];
    const classesById = new Map(classes.map((cls) => [cls.id, cls]));
    return buildStudentAttendanceApiSectionOptions(classId, sections, classesById, {
      includeClassInLabel: false,
    });
  }, [catalogQuery.data, classId]);

  function invalidateAfterUpload() {
    if (!instituteId) return;
    invalidateTeachersListCache(instituteId);
    invalidateStudentsListCache(instituteId);
    void qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.photos) });
    void qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.teachers) });
    void qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.students) });
    void qc.invalidateQueries({ queryKey: adminModulePrefix(instituteId, adminQueryRoots.transport) });
  }

  async function runUpload(
    kind: "gallery" | "camera",
    target:
      | { type: "teacher"; row: PhotoTeacherDto }
      | { type: "student"; row: PhotoStudentDto }
      | { type: "driver"; row: PhotoDriverDto },
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
          : target.type === "driver"
            ? await uploadDriverPhoto(target.row.id, raw)
            : await uploadStudentPhoto(target.row.id, raw);
      setStatusMsg("Photo saved");
      toast(`Photo updated for ${target.row.displayName}`, "success");
      if (target.type === "teacher") {
        setSelectedTeacherId(result.person.id);
        void qc.setQueryData(
          adminQueryKeys.photosTeachers(instituteId ?? "", q),
          (prev: PhotoTeacherDto[] | undefined) =>
            (prev ?? []).map((row) =>
              row.id === result.person.id
                ? {
                    ...row,
                    photoAssetPath: result.photoAssetPath,
                    photoSignedUrl: result.photoSignedUrl,
                    photoExpiresAt: result.photoExpiresAt,
                  }
                : row,
            ),
        );
      } else if (target.type === "driver") {
        setSelectedDriverId(result.person.id);
        void qc.setQueryData(
          adminQueryKeys.photosDrivers(instituteId ?? "", q),
          (prev: PhotoDriverDto[] | undefined) =>
            (prev ?? []).map((row) =>
              row.id === result.person.id
                ? {
                    ...row,
                    photoAssetPath: result.photoAssetPath,
                    photoSignedUrl: result.photoSignedUrl,
                    photoExpiresAt: result.photoExpiresAt,
                  }
                : row,
            ),
        );
      } else {
        setSelectedStudentId(result.person.id);
        void qc.setQueryData(
          adminQueryKeys.photosStudents(instituteId ?? "", classId, sectionId, q),
          (prev: PhotoStudentDto[] | undefined) =>
            (prev ?? []).map((row) =>
              row.id === result.person.id
                ? {
                    ...row,
                    photoAssetPath: result.photoAssetPath,
                    photoSignedUrl: result.photoSignedUrl,
                    photoExpiresAt: result.photoExpiresAt,
                  }
                : row,
            ),
        );
      }
      invalidateAfterUpload();
    } catch (err) {
      if (err instanceof PhotoCaptureCancelledError) {
        setStatusMsg(null);
        return;
      }
      if (err instanceof PhotoPermissionDeniedError) {
        toast(
          "Camera permission denied. Enable Camera for LumenX Admin in device Settings, then try again.",
          "error",
        );
        setStatusMsg("Camera permission denied — open device Settings to enable");
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

  function toggleTeacher(id: string) {
    setSelectedTeacherId((prev) => (prev === id ? null : id));
    setStatusMsg(null);
  }

  function toggleStudent(id: string) {
    setSelectedStudentId((prev) => (prev === id ? null : id));
    setStatusMsg(null);
  }

  function toggleDriver(id: string) {
    setSelectedDriverId((prev) => (prev === id ? null : id));
    setStatusMsg(null);
  }

  if (!apiMode) {
    return (
      <AppShell title={M.photos} subtitle="Profile photo management">
        <ModuleHero
          eyebrow="People"
          title={M.photos}
          subtitle="Profile photo management"
        />
        <Card>
          <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            Photos require API auth mode with a live institute.
          </div>
        </Card>
      </AppShell>
    );
  }

  if (!instituteId) {
    return (
      <AppShell title={M.photos} subtitle="Profile photo management">
        <ModuleHero
          eyebrow="People"
          title={M.photos}
          subtitle="Profile photo management"
        />
        <Card>
          <div className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
            Select an institute to manage profile photos.
          </div>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={M.photos}
      subtitle="Assign staff, student, and driver profile photos"
    >
      <PageStack>
        <ModuleHero
          eyebrow="People"
          title={M.photos}
          subtitle="Assign staff, student, and driver profile photos"
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Pill tone="neutral">{M.photos}</Pill>
          <Pill tone="info">
            {mode === "staff" ? "Staff / Teacher" : mode === "driver" ? "Driver" : "Student"}
          </Pill>
        </div>

        <Card>
          <div className="lx-filter-bar space-y-2 px-3 py-2.5 sm:px-4">
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={mode === "staff" ? "primary" : "outline"}
                onClick={() => {
                  setMode("staff");
                  setSelectedStudentId(null);
                  setSelectedDriverId(null);
                  setStatusMsg(null);
                }}
              >
                Staff / Teacher
              </Button>
              <Button
                size="sm"
                variant={mode === "student" ? "primary" : "outline"}
                onClick={() => {
                  setMode("student");
                  setSelectedTeacherId(null);
                  setSelectedDriverId(null);
                  setStatusMsg(null);
                }}
              >
                Student
              </Button>
              <Button
                size="sm"
                variant={mode === "driver" ? "primary" : "outline"}
                onClick={() => {
                  setMode("driver");
                  setSelectedTeacherId(null);
                  setSelectedStudentId(null);
                  setStatusMsg(null);
                }}
              >
                Drivers
              </Button>
            </div>

            {mode === "student" ? (
              <div className="grid grid-cols-2 gap-2">
                <FilterField id="photos-class" label="Class">
                  <Select
                    id="photos-class"
                    fieldSize="compact"
                    className="lx-filter-field"
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
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </FilterField>
                <FilterField id="photos-section" label="Section">
                  <Select
                    id="photos-section"
                    fieldSize="compact"
                    className="lx-filter-field"
                    value={sectionId}
                    disabled={!classId}
                    onChange={(e) => {
                      setSectionId(e.target.value);
                      setSelectedStudentId(null);
                    }}
                  >
                    <option value="">{classId ? "Select section" : "Select class first"}</option>
                    {sectionOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </Select>
                </FilterField>
              </div>
            ) : null}

            <FilterField id="photos-search" label="Search">
              <SearchInput
                id="photos-search"
                fieldSize="compact"
                inputClassName="lx-filter-field"
                placeholder={
                  mode === "staff"
                    ? "Search staff…"
                    : mode === "driver"
                      ? "Search drivers…"
                      : "Search students…"
                }
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label={
                  mode === "staff"
                    ? "Search staff"
                    : mode === "driver"
                      ? "Search drivers"
                      : "Search students"
                }
              />
            </FilterField>
          </div>
        </Card>

        {statusMsg ? (
          <p className="text-sm text-muted-foreground">{statusMsg}</p>
        ) : null}

        <Card>
          {mode === "staff" && teachersQuery.isLoading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Loading staff…
            </p>
          )}
          {mode === "staff" && teachersQuery.isError && (
            <p className="px-4 py-8 text-center text-sm text-destructive sm:px-5">
              {(teachersQuery.error as Error).message || "Failed to load staff"}
            </p>
          )}
          {mode === "staff" && !teachersQuery.isLoading && teachers.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              No staff found.
            </p>
          )}
          {mode === "staff" &&
            teachers.map((t) => {
              const selected = selectedTeacherId === t.id;
              return (
                <div
                  key={t.id}
                  className={`border-b border-border last:border-0 ${selected ? "bg-muted/50" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:px-5"
                    onClick={() => toggleTeacher(t.id)}
                    aria-expanded={selected}
                  >
                    <PhotoThumb
                      url={t.photoSignedUrl}
                      expiresAt={t.photoExpiresAt}
                      name={t.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.department}
                        {t.phone ? ` · ${t.phone}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {selected ? "Hide" : "Photo"}
                    </span>
                  </button>
                  {selected ? (
                    <div className="px-4 pb-3 sm:px-5">
                      <PersonPhotoActions
                        busy={busy}
                        onGallery={() =>
                          void runUpload("gallery", { type: "teacher", row: t })
                        }
                        onCamera={() =>
                          void runUpload("camera", { type: "teacher", row: t })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}

          {mode === "driver" && driversQuery.isLoading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Loading drivers…
            </p>
          )}
          {mode === "driver" && driversQuery.isError && (
            <p className="px-4 py-8 text-center text-sm text-destructive sm:px-5">
              {(driversQuery.error as Error).message || "Failed to load drivers"}
            </p>
          )}
          {mode === "driver" && !driversQuery.isLoading && drivers.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              No drivers found.
            </p>
          )}
          {mode === "driver" &&
            drivers.map((d) => {
              const selected = selectedDriverId === d.id;
              return (
                <div
                  key={d.id}
                  className={`border-b border-border last:border-0 ${selected ? "bg-muted/50" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:px-5"
                    onClick={() => toggleDriver(d.id)}
                    aria-expanded={selected}
                  >
                    <PhotoThumb
                      url={d.photoSignedUrl}
                      expiresAt={d.photoExpiresAt}
                      name={d.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{d.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {d.licenseNumber}
                        {d.phone ? ` · ${d.phone}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {selected ? "Hide" : "Photo"}
                    </span>
                  </button>
                  {selected ? (
                    <div className="px-4 pb-3 sm:px-5">
                      <PersonPhotoActions
                        busy={busy}
                        onGallery={() =>
                          void runUpload("gallery", { type: "driver", row: d })
                        }
                        onCamera={() =>
                          void runUpload("camera", { type: "driver", row: d })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}

          {mode === "student" && (!classId || !sectionId) && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Select class and section to load students.
            </p>
          )}
          {mode === "student" && classId && sectionId && studentsQuery.isLoading && (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
              Loading students…
            </p>
          )}
          {mode === "student" && studentsQuery.isError && (
            <p className="px-4 py-8 text-center text-sm text-destructive sm:px-5">
              {(studentsQuery.error as Error).message || "Failed to load students"}
            </p>
          )}
          {mode === "student" &&
            classId &&
            sectionId &&
            !studentsQuery.isLoading &&
            students.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground sm:px-5">
                No students in this section.
              </p>
            )}
          {mode === "student" &&
            students.map((s) => {
              const selected = selectedStudentId === s.id;
              const scope = formatStudentScope(s.classLabel, s.sectionLabel);
              return (
                <div
                  key={s.id}
                  className={`border-b border-border last:border-0 ${selected ? "bg-muted/50" : ""}`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 sm:px-5"
                    onClick={() => toggleStudent(s.id)}
                    aria-expanded={selected}
                  >
                    <PhotoThumb
                      url={s.photoSignedUrl}
                      expiresAt={s.photoExpiresAt}
                      name={s.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.displayName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {scope}
                        {s.rollNo ? `${scope ? " · " : ""}Roll ${s.rollNo}` : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {selected ? "Hide" : "Photo"}
                    </span>
                  </button>
                  {selected ? (
                    <div className="px-4 pb-3 sm:px-5">
                      <PersonPhotoActions
                        busy={busy}
                        onGallery={() =>
                          void runUpload("gallery", { type: "student", row: s })
                        }
                        onCamera={() =>
                          void runUpload("camera", { type: "student", row: s })
                        }
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
        </Card>
      </PageStack>
    </AppShell>
  );
}
