import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Pill,
  Card,
  CardHeader,
  Kpi,
  KpiGrid,
  TextInput,
  CascadingFiltersMenu,
} from "@lumenx/ui-admin";
import { ADMISSION_APPLICATIONS } from "@/lib/admin-module-data";
import {
  ADMISSIONS_SYNC_MESSAGE,
  ADMISSIONS_SYNC_REQUEST,
  applyIncomingAdmissionRows,
  ensureAdminSyncSeed,
  markAdmissionConverted,
  stageLabel,
  stageTone,
  type AdmissionsSyncMessage,
  type AdminSyncRow,
} from "@/lib/admissions-sync";
import { getAdmissionsPortalWindow } from "@/lib/admissions-portal-window";
import { ConvertToStudentDialog } from "@/components/admissions/ConvertToStudentDialog";
import { AdmissionDocumentsApiPanel } from "@/components/admissions/AdmissionDocumentsApiPanel";
import { getAdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { AdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { AdmissionConvertDraft } from "@/lib/admission-to-student";
import { validateAdmissionConvertDraft } from "@/lib/admission-to-student";
import { convertAdmissionApplicationToStudent } from "@/lib/admissions/convert-to-student-api";
import { useAdminToast } from "@/components/AdminActionToast";
import { syncSubscriptionHeadcountAfterStudentChange } from "@/lib/subscription-headcount";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { isCollegeMode } from "@/lib/academic-data";
import { formatCollegeBatch } from "@/lib/class-section-filter";
import {
  applyOpeningSeatUpdateAfterConversion,
  buildClassSeatAvailability,
  OPENINGS_STORAGE_KEY,
  subscribeAdmissionOpenings,
  type ClassSeatAvailabilityRow,
} from "@/lib/admissions-opening-seat-sync";
import { admissionsInstituteIdForDemoProfile } from "@lumenx/utils";
import { recordAdmissionOnTimeline } from "@/lib/student-academic-timeline";
import {
  purgeExpiredAdmissionDocumentCopies,
  transferAdmissionDocumentsToStudentProfile,
} from "@/lib/admission-document-lifecycle";
import {
  openAdmissionsFromAdmin,
} from "@/lib/connect-portal-links";
import {
  loadParentDirectory,
  nextParentId,
  saveParentDirectory,
  syncParentToLinkedStudents,
  type ParentDirectoryRecord,
} from "@/lib/parent-directory-store";
import {
  loadStudentDirectory,
  nextStudentId,
  saveStudentDirectory,
  STUDENTS_CHANGED_EVENT,
  studentFromDraft,
} from "@/lib/student-directory-store";
import {
  UserPlus,
  ExternalLink,
  ArrowRight,
  Search,
  CheckCircle2,
  ListOrdered,
  ClipboardList,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isInstituteUuid } from "@/lib/active-institute";
import {
  loadAdmissionsList,
  loadAdmissionsOpeningsList,
  loadAdmissionsProgramsList,
  resolveAdmissionsListView,
  resolveAdmissionsOpeningsListView,
  resolveAdmissionsProgramsListView,
  shouldCommitAdmissionsLoad,
  shouldCommitAdmissionsOpeningsLoad,
  shouldCommitAdmissionsProgramsLoad,
  transitionAdmissionApplication,
  updateAdmissionOpening,
  updateAdmissionProgram,
  getAdmissionApplication,
  listAdmissionDocuments,
  admissionApplicationDtoToAdminDetail,
  type AdmissionApplicationListItem,
  type AdmissionOpeningListItem,
  type AdmissionOpeningStatus,
  type AdmissionProgramListItem,
  type AdmissionProgramStatus,
  type AdmissionsListStatus,
  type AdmissionsOpeningsListStatus,
  type AdmissionsProgramsListStatus,
} from "@/lib/admissions";

export const Route = createFileRoute("/admissions")({
  head: () => ({ meta: [{ title: "Admissions — LumenX Admin" }] }),
  component: AdmissionsPage,
});

function parseDocsRatio(value: string): { verified: number; total: number } {
  const [verifiedRaw, totalRaw] = value.split("/");
  const verified = Number.parseInt(verifiedRaw ?? "0", 10);
  const total = Number.parseInt(totalRaw ?? "0", 10);
  return {
    verified: Number.isFinite(verified) ? verified : 0,
    total: Number.isFinite(total) && total > 0 ? total : 0,
  };
}

function catalogListHint(
  resourceLabel: string,
  status: AdmissionsListStatus,
  errorMessage: string | null,
): string | null {
  if (status === "loading") return `Loading ${resourceLabel}…`;
  if (status === "needs_institute") return `Select an institute to load ${resourceLabel}.`;
  if (status === "forbidden") {
    return errorMessage ?? `You do not have access to ${resourceLabel} for this institute.`;
  }
  if (status === "error") return errorMessage ?? `Failed to load ${resourceLabel}.`;
  if (status === "empty") return `No ${resourceLabel} found for this institute.`;
  return null;
}

function programStatusTone(
  status: AdmissionProgramStatus,
): "neutral" | "success" | "warning" {
  if (status === "published") return "success";
  if (status === "archived") return "warning";
  return "neutral";
}

function openingStatusTone(
  status: AdmissionOpeningStatus,
): "neutral" | "success" | "warning" {
  if (status === "open") return "success";
  if (status === "closed") return "warning";
  return "neutral";
}

/**
 * Thin Admin bridge for Admissions.
 * Application review lives in Connect Admissions (institute).
 * Admin only adds approved applicants into the student directory.
 */
function AdmissionsPage() {
  const notify = useAdminToast();
  const apiMode = isApiAuthMode();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(apiMode, { status: instituteCtx.status, activeInstituteId: instituteCtx.activeInstituteId });
  const { profile, profileId } = useDemoProfile();
  const college = isCollegeMode();
  const defaultDept = profile.academic.departments[0]?.code ?? "MPC";
  const fallback = ADMISSION_APPLICATIONS as AdminSyncRow[];
  const instituteId = admissionsInstituteIdForDemoProfile(profileId);
  const [apps, setApps] = useState<AdminSyncRow[]>(() =>
    apiMode ? [] : ensureAdminSyncSeed(fallback),
  );
  const [apiItems, setApiItems] = useState<AdmissionApplicationListItem[]>([]);
  const [listStatus, setListStatus] = useState<AdmissionsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [listError, setListError] = useState<string | null>(null);
  const [apiPrograms, setApiPrograms] = useState<AdmissionProgramListItem[]>([]);
  const [programsStatus, setProgramsStatus] = useState<AdmissionsProgramsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [programsError, setProgramsError] = useState<string | null>(null);
  const [programsResolvedForInstituteId, setProgramsResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [apiOpenings, setApiOpenings] = useState<AdmissionOpeningListItem[]>([]);
  const [openingsStatus, setOpeningsStatus] = useState<AdmissionsOpeningsListStatus>(() =>
    apiMode ? "loading" : "demo",
  );
  const [openingsError, setOpeningsError] = useState<string | null>(null);
  const [openingsResolvedForInstituteId, setOpeningsResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<
    string | null
  >(null);
  const [reloadKey, setReloadKey] = useState(0);
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  const listView = resolveAdmissionsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedItems: apiItems,
    storedStatus: listStatus,
    storedErrorMessage: listError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const programsListView = resolveAdmissionsProgramsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: programsResolvedForInstituteId,
    storedItems: apiPrograms,
    storedStatus: programsStatus,
    storedErrorMessage: programsError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const openingsListView = resolveAdmissionsOpeningsListView({
    apiMode,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId: openingsResolvedForInstituteId,
    storedItems: apiOpenings,
    storedStatus: openingsStatus,
    storedErrorMessage: openingsError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });
  const programNameById = useMemo(
    () => new Map(programsListView.items.map((program) => [program.id, program.name])),
    [programsListView.items],
  );
  type AppRow = AdminSyncRow | AdmissionApplicationListItem;
  const displayApps: AppRow[] = apiMode ? listView.items : apps;
  const activeApps = listView.rowsValid ? displayApps : [];
  const [seatRows, setSeatRows] = useState<ClassSeatAvailabilityRow[]>(() =>
    buildClassSeatAvailability(instituteId, profile.academic),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<AdminSyncRow["stage"] | "all">("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [docsFilter, setDocsFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [docsReview, setDocsReview] = useState<{ id: string; name: string } | null>(null);

  const refreshSeatRows = () => {
    setSeatRows(buildClassSeatAvailability(instituteId, profile.academic));
  };

  const refreshApps = () => {
    if (apiMode) return;
    setApps(ensureAdminSyncSeed(fallback));
    refreshSeatRows();
    const portal = getAdmissionsPortalWindow();
    if (portal && !portal.closed) {
      try {
        portal.postMessage({ type: ADMISSIONS_SYNC_REQUEST }, "*");
      } catch {
        /* ignore */
      }
    }
  };

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiItems([]);
      setListStatus("loading");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiItems([]);
      setListStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setListError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiItems([]);
      setListStatus("needs_institute");
      setListError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setListStatus("loading");
    setListError(null);
    void loadAdmissionsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAdmissionsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiItems(next.items);
      setListStatus(next.status);
      setListError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiPrograms([]);
      setProgramsStatus("loading");
      setProgramsError(null);
      setProgramsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiPrograms([]);
      setProgramsStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setProgramsError(instituteCtx.errorMessage);
      setProgramsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiPrograms([]);
      setProgramsStatus("needs_institute");
      setProgramsError(null);
      setProgramsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setProgramsStatus("loading");
    setProgramsError(null);
    void loadAdmissionsProgramsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAdmissionsProgramsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiPrograms(next.items);
      setProgramsStatus(next.status);
      setProgramsError(next.errorMessage);
      setProgramsResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    if (!apiMode) return;

    if (instituteCtx.status === "loading") {
      setApiOpenings([]);
      setOpeningsStatus("loading");
      setOpeningsError(null);
      setOpeningsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "error" ||
      instituteCtx.status === "forbidden"
    ) {
      setApiOpenings([]);
      setOpeningsStatus(
        instituteCtx.status === "forbidden" ? "forbidden" : "error",
      );
      setOpeningsError(instituteCtx.errorMessage);
      setOpeningsResolvedForInstituteId(null);
      return;
    }

    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setApiOpenings([]);
      setOpeningsStatus("needs_institute");
      setOpeningsError(null);
      setOpeningsResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setOpeningsStatus("loading");
    setOpeningsError(null);
    void loadAdmissionsOpeningsList(requestInstituteId).then((next) => {
      if (
        !shouldCommitAdmissionsOpeningsLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setApiOpenings(next.items);
      setOpeningsStatus(next.status);
      setOpeningsError(next.errorMessage);
      setOpeningsResolvedForInstituteId(requestInstituteId);
    });
    return () => {
      cancelled = true;
    };
  }, [
    apiMode,
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  useEffect(() => {
    setSearchQuery("");
    setStageFilter("all");
    setGradeFilter("all");
    setDocsFilter("all");
    setSelectedId(null);
    setConvertOpen(false);
  }, [instituteCtx.activeInstituteId]);

  const listHint =
    listView.status === "loading"
      ? "Loading admissions applications…"
      : listView.status === "needs_institute"
        ? "Select an institute to load admissions."
        : listView.status === "forbidden"
          ? listView.errorMessage ??
            "You do not have access to admissions for this institute."
          : listView.status === "error"
            ? listView.errorMessage ?? "Failed to load admissions."
            : listView.status === "empty"
              ? "No applications found for this institute."
              : null;

  const countLabel = (count: number) =>
    apiMode && !listView.rowsValid ? "…" : String(count);

  const approved = useMemo(
    () => activeApps.filter((a) => a.stage === "approved"),
    [activeApps],
  );
  const counts = useMemo(() => {
    const by = (stage: AdminSyncRow["stage"]) =>
      activeApps.filter((a) => a.stage === stage).length;
    return {
      total: activeApps.length,
      submitted: by("submitted"),
      review: by("review"),
      verification: by("verification"),
      parentConfirmation: by("parent_confirmation"),
      waitlisted: by("waitlisted"),
      approved: by("approved"),
      rejected: by("rejected"),
      withdrawn: by("withdrawn"),
    };
  }, [activeApps]);

  const reportRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activeApps.filter((row) => {
      if (stageFilter !== "all" && row.stage !== stageFilter) return false;
      if (gradeFilter !== "all" && row.grade !== gradeFilter) return false;
      if (docsFilter !== "all" && !apiMode) {
        const ratio = parseDocsRatio(row.docs);
        const complete = ratio.total > 0 && ratio.verified >= ratio.total;
        if (docsFilter === "complete" && !complete) return false;
        if (docsFilter === "incomplete" && complete) return false;
      }
      if (!q) return true;
      return [row.id, row.name, row.grade, row.docs, row.applied, row.instituteId ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [activeApps, apiMode, docsFilter, gradeFilter, searchQuery, stageFilter]);

  const gradeOptions = useMemo(
    () => [...new Set(activeApps.map((row) => row.grade))].sort((a, b) => a.localeCompare(b)),
    [activeApps],
  );

  const selected = useMemo(
    () => (selectedId ? displayApps.find((a) => a.id === selectedId) ?? null : null),
    [displayApps, selectedId],
  );
  const [apiSelectedDetail, setApiSelectedDetail] = useState<AdminAdmissionDetail | null>(null);
  const demoSelectedDetail = useMemo(
    () => (selectedId && !apiMode ? getAdminAdmissionDetail(selectedId) : null),
    [selectedId, apiMode],
  );
  const selectedDetail = apiMode ? apiSelectedDetail : demoSelectedDetail;

  useEffect(() => {
    if (!apiMode || !selectedId || !convertOpen) {
      if (!convertOpen) setApiSelectedDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const app = await getAdmissionApplication(selectedId);
        const docs = await listAdmissionDocuments(selectedId);
        const programName = programNameById.get(app.programId);
        if (!cancelled) {
          setApiSelectedDetail(
            admissionApplicationDtoToAdminDetail(app, docs, programName),
          );
        }
      } catch {
        if (!cancelled) setApiSelectedDetail(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiMode, selectedId, convertOpen, programNameById]);

  useEffect(() => {
    if (apiMode) return;
    purgeExpiredAdmissionDocumentCopies();
    refreshApps();

    const onStorage = (event: StorageEvent) => {
      if (
        event.key === "ues_admissions_sync" ||
        event.key === "ues_admissions_applications" ||
        event.key === OPENINGS_STORAGE_KEY ||
        event.key === null
      ) {
        refreshApps();
      }
    };
    const onFocus = () => refreshApps();
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshApps();
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as AdmissionsSyncMessage | undefined;
      if (!data || data.type !== ADMISSIONS_SYNC_MESSAGE) return;
      if (!Array.isArray(data.applications)) return;
      setApps(applyIncomingAdmissionRows(fallback, data.applications));
    };
    const onStudentsChanged = () => refreshSeatRows();
    const unsubOpenings = subscribeAdmissionOpenings(refreshSeatRows);

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("message", onMessage);
    window.addEventListener(STUDENTS_CHANGED_EVENT, onStudentsChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("message", onMessage);
      window.removeEventListener(STUDENTS_CHANGED_EVENT, onStudentsChanged);
      unsubOpenings();
    };
  }, [instituteId, profile.academic]);

  const gradeKeyFor = (className: string, section: string) => {
    const levelMeta = profile.academic.levels.find((level) => level.label === className);
    return college
      ? formatCollegeBatch(defaultDept, levelMeta?.shortLabel ?? "FY", section || "NA")
      : `${className.replace("Grade ", "")}${section ? `-${section}` : ""}`;
  };

  const convertToStudent = (draft: AdmissionConvertDraft) => {
    if (!writesEnabled || !selected) return;
    const errors = validateAdmissionConvertDraft(draft);
    if (errors.length > 0) {
      notify(errors[0] ?? "Invalid convert draft");
      return;
    }
    if (apiMode) {
      if (!isInstituteUuid(selected.id)) {
        notify("Application id must be a valid UUID in API mode");
        return;
      }
      void convertAdmissionApplicationToStudent(selected.id, draft)
        .then((result) => {
          setSelectedId(null);
          setConvertOpen(false);
          setReloadKey((k) => k + 1);
          notify(
            `Student enrolled${result.parentId ? " · Parent Connect account ready" : ""}`,
          );
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to convert application");
        });
      return;
    }
    const directory = loadStudentDirectory();
    const id = nextStudentId(directory);
    const studentDraft = {
      ...draft.student,
      createConnectAccount: false,
      studentPhone: "",
      studentEmail: "",
    };
    const baseRecord = studentFromDraft(
      studentDraft,
      id,
      gradeKeyFor(draft.student.className, draft.student.section),
    );
    const withIdExtras: typeof baseRecord = {
      ...baseRecord,
      bloodGroup: selectedDetail?.student.bloodGroup?.trim() || undefined,
      photoDataUrl:
        selectedDetail?.documents.find((d) => d.type === "student_photo")?.previewImageUrl ||
        undefined,
    };
    const { student: record, movedCount, purgeAfter } =
      transferAdmissionDocumentsToStudentProfile({
        student: withIdExtras,
        applicationId: selected.id,
        detail: selectedDetail,
      });
    saveStudentDirectory([...directory, record]);
    syncSubscriptionHeadcountAfterStudentChange();
    recordAdmissionOnTimeline(record, draft.academicYear);

    let parentCreated = false;
    if (draft.createParentAccount) {
      const parents = loadParentDirectory();
      const parent: ParentDirectoryRecord = {
        id: nextParentId(parents),
        name: draft.student.parentName.trim(),
        email: draft.parentEmail.trim().toLowerCase(),
        phone: draft.student.parentPhone,
        password: draft.parentPassword,
        relationship: draft.parentRelationship,
        address: draft.student.address.trim() || "Address pending verification",
        linkedStudentIds: [record.id],
        inviteStatus: "pending",
        accessStatus: "active",
      };
      saveParentDirectory([...parents, parent]);
      syncParentToLinkedStudents(parent);
      parentCreated = true;
    }

    markAdmissionConverted(selected.id);

    const openingUpdate = applyOpeningSeatUpdateAfterConversion({
      instituteId: selected.instituteId,
      className: draft.student.className,
      seatsRemaining: draft.seatsRemaining,
    });

    setApps((prev) => {
      const next = prev.filter((a) => a.id !== selected.id);
      try {
        localStorage.setItem(
          "ues_admissions_sync",
          JSON.stringify({
            updatedAt: new Date().toISOString(),
            applications: next,
          }),
        );
      } catch {
        // ignore
      }
      return next;
    });
    setSelectedId(null);
    setConvertOpen(false);
    refreshSeatRows();
    notify(
      `${record.name} enrolled${parentCreated ? " · Parent Connect account ready" : ""}`,
    );
    if (movedCount > 0) {
      notify(
        `${movedCount} admission documents moved to Student Profile · admission copies purge after ${new Date(purgeAfter).toLocaleDateString("en-IN")}`,
      );
    }
    if (openingUpdate.updated) {
      notify(
        openingUpdate.waitlistOnly
          ? `${openingUpdate.openingName ?? draft.student.className}: Waitlist Only (0 seats remaining)`
          : `${openingUpdate.openingName ?? draft.student.className}: seats updated to ${draft.seatsRemaining}`,
      );
    }
  };

  const openConvert = (id: string) => {
    if (!writesEnabled) {
      notify("Convert to student is not enabled in API read-only mode");
      return;
    }
    setSelectedId(id);
    setConvertOpen(true);
  };

  return (
    <AppShell
      title="Admissions"
      subtitle={
        apiMode
          ? `API mode · ${countLabel(activeApps.length)} applications · ${programsListView.rowsValid ? programsListView.items.length : "…"} programs · ${openingsListView.rowsValid ? openingsListView.items.length : "…"} openings · verified/total doc counts`
          : "Review applications in Connect · add approved students here"
      }
      actions={
        writesEnabled ? (
          <>
            <Button onClick={() => openAdmissionsFromAdmin("applications")}>
              <ClipboardList className="size-3.5" /> Review applications
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
            <Button
              variant="primary"
              onClick={() => openAdmissionsFromAdmin("institute")}
            >
              Open Admissions portal
              <ExternalLink className="size-3.5 opacity-70" />
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                {apiMode
                  ? "Admissions applications"
                  : "Check and decide on applications in the Admissions portal"}
              </div>
              <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
                {apiMode
                  ? "Programs, openings, and application pipeline from the API. Catalog status updates are writable; convert-to-student remains portal/Students-side."
                  : "Move applications through Submitted → Review → Verification → Parent Confirmation → Approved (or Rejected / Withdrawn) in Connect. Come back to Admin only to add an approved applicant as a student (and create a parent login if needed)."}
              </p>
            </div>
            {writesEnabled ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => openAdmissionsFromAdmin("institute")}
              >
                Go to Admissions portal <ArrowRight className="size-3.5" />
              </Button>
            </div>
            ) : null}
          </div>
        </Card>

        {apiMode ? (
          <>
            <Card>
              <CardHeader
                title="Admission programs"
                hint="Program catalog from the API"
                action={
                  <Pill tone="neutral">
                    {programsListView.rowsValid
                      ? `${programsListView.items.length} program(s)`
                      : "…"}
                  </Pill>
                }
              />
              {!programsListView.rowsValid ? (
                <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                  {catalogListHint(
                    "admission programs",
                    programsListView.status,
                    programsListView.errorMessage,
                  ) ?? "Loading admission programs…"}
                </div>
              ) : programsListView.items.length === 0 ? (
                <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                  {catalogListHint(
                    "admission programs",
                    programsListView.status,
                    programsListView.errorMessage,
                  )}
                </div>
              ) : (
                <div className="space-y-2 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  {programsListView.items.map((program) => (
                    <div
                      key={program.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{program.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {program.academicYearLabel} · Deadline {program.applicationDeadline}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                          <span className="text-muted-foreground">Seats </span>
                          <span className="font-medium tabular-nums">
                            {program.seatsAvailable}
                          </span>
                        </span>
                        <Pill tone={programStatusTone(program.status)}>
                          {program.status.replace("_", " ")}
                        </Pill>
                        {writesEnabled && program.status !== "archived" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void updateAdmissionProgram(program.id, {
                                status: "archived",
                              })
                                .then(() => {
                                  setReloadKey((k) => k + 1);
                                  notify(`Archived ${program.name}`);
                                })
                                .catch((err) => {
                                  notify(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to archive program",
                                  );
                                });
                            }}
                          >
                            Archive
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Admission openings"
                hint="Openings linked to programs"
                action={
                  <Pill tone="neutral">
                    {openingsListView.rowsValid
                      ? `${openingsListView.items.length} opening(s)`
                      : "…"}
                  </Pill>
                }
              />
              {!openingsListView.rowsValid ? (
                <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                  {catalogListHint(
                    "admission openings",
                    openingsListView.status,
                    openingsListView.errorMessage,
                  ) ?? "Loading admission openings…"}
                </div>
              ) : openingsListView.items.length === 0 ? (
                <div className="px-5 pb-6 text-center text-sm text-muted-foreground">
                  {catalogListHint(
                    "admission openings",
                    openingsListView.status,
                    openingsListView.errorMessage,
                  )}
                </div>
              ) : (
                <div className="space-y-2 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
                  {openingsListView.items.map((opening) => (
                    <div
                      key={opening.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium">{opening.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {programNameById.get(opening.programId) ?? "Program"} ·{" "}
                          {opening.academicYearLabel} · Deadline {opening.applicationDeadline}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                          <span className="text-muted-foreground">Seats </span>
                          <span className="font-medium tabular-nums">
                            {opening.seatsAvailable}
                          </span>
                        </span>
                        <Pill tone={openingStatusTone(opening.status)}>
                          {opening.status}
                        </Pill>
                        {writesEnabled && opening.status === "open" ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              void updateAdmissionOpening(opening.id, {
                                status: "closed",
                              })
                                .then(() => {
                                  setReloadKey((k) => k + 1);
                                  notify(`Closed ${opening.name}`);
                                })
                                .catch((err) => {
                                  notify(
                                    err instanceof Error
                                      ? err.message
                                      : "Failed to close opening",
                                  );
                                });
                            }}
                          >
                            Close
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}

        {!listView.rowsValid ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            {listHint ?? "Loading admissions applications…"}
          </div>
        ) : (
        <>
        <KpiGrid cols={4}>
          <Kpi
            label="Total applications"
            value={countLabel(counts.total)}
            delta={`${counts.review + counts.verification + counts.parentConfirmation + counts.waitlisted} active pipeline`}
            icon={<ClipboardList className="size-3.5" />}
          />
          <Kpi
            label="Review"
            value={countLabel(counts.review)}
            delta="In review queue"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Verification"
            value={countLabel(counts.verification)}
            delta="Docs verification"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Parent confirmation"
            value={countLabel(counts.parentConfirmation)}
            delta="Awaiting parent decision"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Approved"
            value={countLabel(counts.approved)}
            delta="Ready for conversion"
            tone="up"
            icon={<CheckCircle2 className="size-3.5" />}
          />
          <Kpi
            label="Rejected"
            value={countLabel(counts.rejected)}
            delta="Not selected"
            tone="down"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Withdrawn"
            value={countLabel(counts.withdrawn)}
            delta="Closed by lifecycle/action"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Waitlist"
            value={countLabel(counts.waitlisted)}
            delta="Seat dependent"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Pending conversion"
            value={countLabel(counts.approved)}
            delta={`${approved.length} approved not yet converted`}
            tone="up"
            icon={<UserPlus className="size-3.5" />}
          />
        </KpiGrid>

        {writesEnabled ? (
        <Card>
          <CardHeader
            title="Available seats by class"
            hint="Capacity from class setup · occupied from student directory · openings cap availability when published"
            action={<Pill tone="info">{seatRows.length} classes</Pill>}
          />
          <div className="space-y-2 px-5 pb-5 pt-1 sm:px-6 sm:pb-6">
            {seatRows.map((row) => (
              <div
                key={row.classLabel}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium">{row.classLabel}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {row.hasOpening
                      ? "Admissions opening linked"
                      : row.source === "class-directory"
                        ? "From class capacity setup"
                        : "Default class capacity"}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                    <span className="text-muted-foreground">Total </span>
                    <span className="font-medium tabular-nums">{row.totalCapacity}</span>
                  </span>
                  <span className="rounded-md border border-border bg-background/60 px-2 py-1">
                    <span className="text-muted-foreground">Occupied </span>
                    <span className="font-medium tabular-nums">{row.occupied}</span>
                  </span>
                  <Pill tone={row.available > 0 ? "success" : "warning"}>
                    {row.available} available
                  </Pill>
                </div>
              </div>
            ))}
          </div>
        </Card>
        ) : null}

        <Card>
          <CardHeader
            title="Admissions reporting"
            hint={
              apiMode
                ? "Read-only application list from API"
                : "Search and filter across all applications"
            }
            action={<Pill tone="neutral">{reportRows.length} result(s)</Pill>}
          />
          <div className="flex flex-wrap items-end gap-3 px-5 pb-4 sm:px-6">
            <div className="min-w-[14rem] flex-1">
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                <Search className="size-3" />
                Search
              </label>
              <TextInput
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="ID, student, class, docs, date, institute..."
              />
            </div>
            <CascadingFiltersMenu
              groups={[
                {
                  id: "stage",
                  label: "Stage",
                  value: stageFilter,
                  onChange: (v) => setStageFilter(v as AdminSyncRow["stage"] | "all"),
                  options: [
                    { value: "all", label: "All stages" },
                    { value: "submitted", label: "Submitted" },
                    { value: "review", label: "Review" },
                    { value: "verification", label: "Verification" },
                    { value: "parent_confirmation", label: "Parent confirmation" },
                    { value: "waitlisted", label: "Waitlist" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" },
                    { value: "withdrawn", label: "Withdrawn" },
                  ],
                },
                {
                  id: "class",
                  label: "Class",
                  value: gradeFilter,
                  onChange: setGradeFilter,
                  options: [
                    { value: "all", label: "All classes" },
                    ...gradeOptions.map((grade) => ({ value: grade, label: grade })),
                  ],
                },
                {
                  id: "docs",
                  label: "Documents",
                  value: docsFilter,
                  onChange: (v) => setDocsFilter(v as "all" | "complete" | "incomplete"),
                  options: [
                    { value: "all", label: "All" },
                    ...(apiMode
                      ? []
                      : [
                          { value: "complete", label: "Complete" },
                          { value: "incomplete", label: "Incomplete" },
                        ]),
                  ],
                },
              ]}
            />
          </div>
          {reportRows.length === 0 ? (
            <div className="px-5 pb-6 text-xs text-muted-foreground sm:px-6">
              {listHint ?? "No applications match your filters."}
            </div>
          ) : (
            <ul className="divide-y divide-border px-2 pb-2 sm:px-3">
              {reportRows.map((app) => (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center gap-3 px-2 py-3 sm:px-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{app.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{app.id}</span>
                      {" · "}
                      {app.grade}
                      {" · Applied "}
                      {app.applied}
                      {" · Docs "}
                      {app.docs}
                    </div>
                  </div>
                  <Pill tone={stageTone(app.stage)}>{stageLabel(app.stage)}</Pill>
                  {apiMode && writesEnabled ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDocsReview({ id: app.id, name: app.name })}
                    >
                      Docs
                    </Button>
                  ) : null}
                  {writesEnabled && app.stage === "approved" ? (
                    <Button variant="primary" size="sm" onClick={() => openConvert(app.id)}>
                      <UserPlus className="size-3.5" /> Convert
                    </Button>
                  ) : null}
                  {apiMode && writesEnabled && app.stage === "review" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        void transitionAdmissionApplication(app.id, {
                          status: "approved",
                        })
                          .then(() => {
                            setReloadKey((k) => k + 1);
                            notify(`${app.name} approved`);
                          })
                          .catch((err) => {
                            notify(
                              err instanceof Error
                                ? err.message
                                : "Failed to transition application",
                            );
                          });
                      }}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {apiMode &&
                  writesEnabled &&
                  (app.stage === "review" || app.stage === "verification") ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        void transitionAdmissionApplication(app.id, {
                          status: "rejected",
                          decisionNote: "Rejected from Admin",
                        })
                          .then(() => {
                            setReloadKey((k) => k + 1);
                            notify(`${app.name} rejected`);
                          })
                          .catch((err) => {
                            notify(
                              err instanceof Error
                                ? err.message
                                : "Failed to transition application",
                            );
                          });
                      }}
                    >
                      Reject
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        {writesEnabled ? (
        <Card>
          <CardHeader
            title="Add approved applicants as students"
            hint="Creates the student record · optional parent login"
            action={
              <Button
                size="sm"
                onClick={() => openAdmissionsFromAdmin("applications")}
              >
                Review applications <ExternalLink className="size-3 opacity-70" />
              </Button>
            }
          />
          {approved.length === 0 ? (
            <div className="px-5 pb-6 text-center">
              <p className="text-sm text-muted-foreground">
                No approved applicants waiting to be added as students.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Approve an application in the Admissions portal, then return here (or refresh)
                to create their student record. Demo seed includes ready-to-convert applicants
                until you convert them.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={refreshApps}>
                  Refresh list
                </Button>
                <Button
                  variant="primary"
                  onClick={() => openAdmissionsFromAdmin("applications")}
                >
                  Review applications <ExternalLink className="size-3.5 opacity-70" />
                </Button>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-border px-2 pb-2 sm:px-3">
              {approved.map((app) => (
                <li
                  key={app.id}
                  className="flex flex-wrap items-center gap-3 px-2 py-3 sm:px-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium">{app.name}</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">
                      <span className="font-mono">{app.id}</span>
                      {" · "}
                      {app.grade}
                      {" · Applied "}
                      {app.applied}
                      {" · Docs "}
                      {app.docs}
                    </div>
                  </div>
                  <Pill tone={stageTone(app.stage)}>{stageLabel(app.stage)}</Pill>
                  <Button variant="primary" size="sm" onClick={() => openConvert(app.id)}>
                    <UserPlus className="size-3.5" /> Convert to student
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        ) : null}

        <p className="text-[11px] text-muted-foreground px-1">
          {writesEnabled ? (
            <>
          After you add them as a student, manage the record under{" "}
          <Link to="/students" className="text-primary font-medium hover:underline">
            Students
          </Link>
          {" · "}
          parent login under{" "}
          <Link to="/parents" className="text-primary font-medium hover:underline">
            Parents
          </Link>
          .
            </>
          ) : (
            "Student conversion and parent account creation are not enabled in API read-only mode."
          )}
        </p>
        </>
        )}
      </div>

      {writesEnabled ? (
      <ConvertToStudentDialog
        open={convertOpen}
        row={selected}
        detail={selectedDetail}
        academic={profile.academic}
        onClose={() => {
          setConvertOpen(false);
          setSelectedId(null);
        }}
        onConvert={convertToStudent}
      />
      ) : null}

      {docsReview ? (
        <AdmissionDocumentsApiPanel
          applicationId={docsReview.id}
          applicationName={docsReview.name}
          open
          onClose={() => setDocsReview(null)}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      ) : null}
    </AppShell>
  );
}
