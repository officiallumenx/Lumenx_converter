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
import { getAdminAdmissionDetail } from "@/lib/admissions-application-details";
import type { AdmissionConvertDraft } from "@/lib/admission-to-student";
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
import { useEffect, useMemo, useState } from "react";

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

/**
 * Thin Admin bridge for Admissions.
 * Application review lives in Connect Admissions (institute).
 * Admin only adds approved applicants into the student directory.
 */
function AdmissionsPage() {
  const notify = useAdminToast();
  const { profile, profileId } = useDemoProfile();
  const college = isCollegeMode();
  const defaultDept = profile.academic.departments[0]?.code ?? "MPC";
  const fallback = ADMISSION_APPLICATIONS as AdminSyncRow[];
  const instituteId = admissionsInstituteIdForDemoProfile(profileId);
  const [apps, setApps] = useState<AdminSyncRow[]>(() => ensureAdminSyncSeed(fallback));
  const [seatRows, setSeatRows] = useState<ClassSeatAvailabilityRow[]>(() =>
    buildClassSeatAvailability(instituteId, profile.academic),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<AdminSyncRow["stage"] | "all">("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [docsFilter, setDocsFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const refreshSeatRows = () => {
    setSeatRows(buildClassSeatAvailability(instituteId, profile.academic));
  };

  const refreshApps = () => {
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

  const approved = useMemo(
    () => apps.filter((a) => a.stage === "approved"),
    [apps],
  );
  const counts = useMemo(() => {
    const by = (stage: AdminSyncRow["stage"]) =>
      apps.filter((a) => a.stage === stage).length;
    return {
      total: apps.length,
      submitted: by("submitted"),
      review: by("review"),
      verification: by("verification"),
      parentConfirmation: by("parent_confirmation"),
      waitlisted: by("waitlisted"),
      approved: by("approved"),
      rejected: by("rejected"),
      withdrawn: by("withdrawn"),
    };
  }, [apps]);

  const reportRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return apps.filter((row) => {
      if (stageFilter !== "all" && row.stage !== stageFilter) return false;
      if (gradeFilter !== "all" && row.grade !== gradeFilter) return false;
      if (docsFilter !== "all") {
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
  }, [apps, docsFilter, gradeFilter, searchQuery, stageFilter]);

  const gradeOptions = useMemo(
    () => [...new Set(apps.map((row) => row.grade))].sort((a, b) => a.localeCompare(b)),
    [apps],
  );

  const selected = useMemo(
    () => (selectedId ? apps.find((a) => a.id === selectedId) ?? null : null),
    [apps, selectedId],
  );
  const selectedDetail = useMemo(
    () => (selectedId ? getAdminAdmissionDetail(selectedId) : null),
    [selectedId],
  );

  useEffect(() => {
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
    if (!selected) return;
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
    setSelectedId(id);
    setConvertOpen(true);
  };

  return (
    <AppShell
      title="Admissions"
      subtitle="Review applications in Connect · add approved students here"
      actions={
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
      }
    >
      <div className="space-y-4">
        <Card className="overflow-hidden border-primary/20 bg-primary/[0.03]">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <div className="text-xs font-semibold text-foreground">
                Check and decide on applications in the Admissions portal
              </div>
              <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
                Move applications through Submitted → Review → Verification → Parent
                Confirmation → Approved (or Rejected / Withdrawn) in Connect. Come back to
                Admin only to add an approved applicant as a student (and create a parent login
                if needed).
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() => openAdmissionsFromAdmin("institute")}
              >
                Go to Admissions portal <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>

        <KpiGrid cols={4}>
          <Kpi
            label="Total applications"
            value={String(counts.total)}
            delta={`${counts.review + counts.verification + counts.parentConfirmation + counts.waitlisted} active pipeline`}
            icon={<ClipboardList className="size-3.5" />}
          />
          <Kpi
            label="Review"
            value={String(counts.review)}
            delta="In review queue"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Verification"
            value={String(counts.verification)}
            delta="Docs verification"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Parent confirmation"
            value={String(counts.parentConfirmation)}
            delta="Awaiting parent decision"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Approved"
            value={String(counts.approved)}
            delta="Ready for conversion"
            tone="up"
            icon={<CheckCircle2 className="size-3.5" />}
          />
          <Kpi
            label="Rejected"
            value={String(counts.rejected)}
            delta="Not selected"
            tone="down"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Withdrawn"
            value={String(counts.withdrawn)}
            delta="Closed by lifecycle/action"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Waitlist"
            value={String(counts.waitlisted)}
            delta="Seat dependent"
            icon={<ListOrdered className="size-3.5" />}
          />
          <Kpi
            label="Pending conversion"
            value={String(counts.approved)}
            delta={`${approved.length} approved not yet converted`}
            tone="up"
            icon={<UserPlus className="size-3.5" />}
          />
        </KpiGrid>

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

        <Card>
          <CardHeader
            title="Admissions reporting"
            hint="Search and filter across all applications"
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
                    { value: "complete", label: "Complete" },
                    { value: "incomplete", label: "Incomplete" },
                  ],
                },
              ]}
            />
          </div>
          {reportRows.length === 0 ? (
            <div className="px-5 pb-6 text-xs text-muted-foreground sm:px-6">
              No applications match your filters.
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
                  {app.stage === "approved" ? (
                    <Button variant="primary" size="sm" onClick={() => openConvert(app.id)}>
                      <UserPlus className="size-3.5" /> Convert
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

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

        <p className="text-[11px] text-muted-foreground px-1">
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
        </p>
      </div>

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
    </AppShell>
  );
}
