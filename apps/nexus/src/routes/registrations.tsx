import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  Field,
  Kpi,
  KpiGrid,
  Modal,
  PageToolbar,
  Pill,
  SegmentedControl,
  TextArea,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardList,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  UserRound,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { setAdminBoundNexusInstituteId } from "@lumenx/config";
import { publicProfileFromRegistrationSeed } from "@lumenx/utils";
import {
  approveInstituteRegistration,
  rejectInstituteRegistration,
  startInstituteTrial,
  subscribeInstituteRegistrations,
  type InstituteRegistrationApplication,
  type InstituteRegistrationStatus,
} from "@lumenx/utils";
import {
  createPlatformInstitute,
  defaultCreateForm,
} from "@/lib/institute-directory-store";
import { InstituteLogo } from "@/components/institutes/InstituteDirectoryCard";
import { isNexusApiMode } from "@/lib/auth-mode";
import { mapRegistrationDtoToApplication } from "@/lib/registrations/map";
import {
  performApiApprove,
  performApiReject,
} from "@/lib/registrations/review-actions";
import {
  countApplications,
  loadRegistrationsQueue,
  type RegistrationsQueueState,
  type StatusFilter,
} from "@/lib/registrations/load-queue";

export const Route = createFileRoute("/registrations")({
  head: () => ({ meta: [{ title: "Pending Registrations — LumenX Nexus" }] }),
  component: RegistrationsPage,
});

function statusTone(status: InstituteRegistrationStatus): "success" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

function RegistrationsPage() {
  const navigate = useNavigate();
  const apiMode = isNexusApiMode();
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [queueState, setQueueState] = useState<RegistrationsQueueState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);

  const reloadQueue = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (apiMode) {
      let cancelled = false;
      setQueueState({ status: "loading" });
      void loadRegistrationsQueue().then((next) => {
        if (!cancelled) setQueueState(next);
      });
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;
    void loadRegistrationsQueue().then((next) => {
      if (!cancelled) setQueueState(next);
    });
    const unsub = subscribeInstituteRegistrations(() => reloadQueue());
    return () => {
      cancelled = true;
      unsub();
    };
  }, [apiMode, reloadKey, reloadQueue]);

  const all = useMemo(() => {
    if (queueState.status !== "ready") return [];
    return queueState.applications;
  }, [queueState]);

  const counts = useMemo(() => countApplications(all), [all]);

  const filtered = useMemo(() => {
    if (filter === "all") return all;
    return all.filter((a) => a.status === filter);
  }, [all, filter]);

  const selected = useMemo(() => {
    if (selectedId) {
      const hit = all.find((a) => a.id === selectedId);
      if (hit) return hit;
    }
    return filtered[0] ?? null;
  }, [all, filtered, selectedId]);

  useEffect(() => {
    if (selected && selectedId !== selected.id) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const refreshQueueAfterAction = useCallback(async () => {
    const next = await loadRegistrationsQueue();
    setQueueState(next);
    return next;
  }, []);

  const handleApproveConfirm = async () => {
    if (!selected) return;
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);
    try {
      if (apiMode) {
        const result = await performApiApprove(selected.id);
        if (!result.ok) {
          setActionError(
            result.unauthorized
              ? "Authentication required — sign in as an authorized Nexus reviewer."
              : result.forbidden
                ? "You are not authorized to approve registrations."
                : result.message,
          );
          return;
        }
        setApproveOpen(false);
        const next = await refreshQueueAfterAction();
        const mapped = mapRegistrationDtoToApplication(result.registration);
        setSelectedId(mapped.id);
        if (result.registration.instituteId) {
          setAdminBoundNexusInstituteId(result.registration.instituteId);
        }
        setActionSuccess(
          `Approved ${mapped.payload.instituteName}. Institute provisioning completed on the backend.`,
        );
        if (next.status === "ready") {
          setFilter("approved");
        }
        return;
      }

      const defaults = defaultCreateForm();
      const created = createPlatformInstitute({
        ...defaults,
        name: selected.payload.instituteName,
        city: selected.payload.city,
        state: selected.payload.state,
        country: selected.payload.country || "India",
        addressLine: selected.payload.address,
        pincode: selected.payload.pincode,
        board: selected.payload.educationBoard || defaults.board,
        instituteType: selected.payload.instituteType || defaults.instituteType,
        contactEmail: selected.payload.principalEmail,
        contactPhone: selected.payload.principalMobile,
        logoUrl: selected.payload.logoPreview || undefined,
        initialStatus: "trial",
        amountInr: 0,
      });
      approveInstituteRegistration(selected.id, {
        approvedInstituteId: created.id,
        reviewedBy: "Nexus Operator",
      });
      startInstituteTrial({
        instituteId: created.id,
        instituteName: created.name,
        assignedRateInr: 12,
        activeStudentCount: 0,
      });
      setAdminBoundNexusInstituteId(created.id);
      setApproveOpen(false);
      reloadQueue();
      void navigate({ to: "/institutes/$id", params: { id: created.id } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selected) return;
    setActionError(null);
    setActionSuccess(null);
    setActionLoading(true);
    const reason = rejectReason.trim();
    try {
      if (apiMode) {
        if (!reason) {
          setActionError("Enter a rejection reason before confirming.");
          return;
        }
        const result = await performApiReject(selected.id, reason);
        if (!result.ok) {
          setActionError(
            result.unauthorized
              ? "Authentication required — sign in as an authorized Nexus reviewer."
              : result.forbidden
                ? "You are not authorized to reject registrations."
                : result.message,
          );
          return;
        }
        setRejectOpen(false);
        setRejectReason("");
        await refreshQueueAfterAction();
        setSelectedId(result.registration.id);
        setFilter("rejected");
        setActionSuccess(
          `Rejected ${selected.payload.instituteName}. The applicant remains blocked until a new registration is submitted.`,
        );
        return;
      }

      rejectInstituteRegistration(selected.id, {
        reason: reason || "Registration declined by Nexus",
        reviewedBy: "Nexus Operator",
      });
      setRejectOpen(false);
      setRejectReason("");
      reloadQueue();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setActionLoading(false);
    }
  };

  const loading = queueState.status === "loading";
  const queueError = queueState.status === "error" ? queueState : null;

  return (
    <AppShell
      title="Registrations"
      subtitle={
        apiMode
          ? "Live institute registration queue from GET /api/nexus/registrations"
          : "Admin self-registration queue · Approve creates the institute on Institutes and unlocks Admin"
      }
    >
      <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
        {apiMode ? (
          <>
            Review real pending registrations submitted through Admin API mode.
            Verification is intentionally <span className="font-medium text-foreground">manual and offline</span>{" "}
            — confirm institute details outside the product, then Approve or Reject.
            Backend authorization applies; applicants cannot review their own registration.
          </>
        ) : (
          <>
            Admin signup appears here as{" "}
            <span className="font-medium text-foreground">Pending</span> (not on Institutes
            yet). Use the same host for both apps (
            <span className="font-mono text-foreground">localhost</span>, not{" "}
            <span className="font-mono text-foreground">127.0.0.1</span>
            ). Click <span className="font-medium text-foreground">Approve</span> to create
            the institute and open it.
          </>
        )}
      </div>

      {loading && (
        <div className="mb-4 rounded-xl border border-border bg-muted/20 px-4 py-8 flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading registrations from the server…</p>
        </div>
      )}

      {queueError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">
                {queueError.unauthorized
                  ? "Authentication required"
                  : queueError.forbidden
                    ? "Not authorized to review registrations"
                    : "Unable to load registrations"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">{queueError.message}</p>
            </div>
          </div>
          <Button variant="outline" onClick={reloadQueue}>
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        </div>
      )}

      <KpiGrid cols={4} className="mb-6">
        <Kpi label="Pending" value={String(counts.pending)} icon={<ClipboardList className="size-3.5" />} />
        <Kpi label="Approved" value={String(counts.approved)} tone="up" icon={<CheckCircle2 className="size-3.5" />} />
        <Kpi label="Rejected" value={String(counts.rejected)} tone={counts.rejected ? "down" : "neutral"} icon={<XCircle className="size-3.5" />} />
        <Kpi label="Total" value={String(counts.total)} icon={<Building2 className="size-3.5" />} />
      </KpiGrid>

      <Card className="mb-4">
        <div className="px-3 sm:px-4 py-3">
          <PageToolbar className="border-0 bg-transparent px-0 py-0">
            <ToolbarGroup>
              <SegmentedControl
                value={filter}
                onChange={(v) => setFilter(v as StatusFilter)}
                options={[
                  { value: "pending", label: `Pending (${counts.pending})` },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "all", label: "All" },
                ]}
              />
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarMeta>
              {apiMode
                ? "Live backend queue · no localStorage fallback"
                : "Admin submissions sync via shared cookie on localhost · demo seed for review practice"}
            </ToolbarMeta>
            {apiMode && (
              <Button variant="outline" onClick={reloadQueue} disabled={loading}>
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
            )}
          </PageToolbar>
        </div>
      </Card>

      {actionSuccess && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-300">
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="text-sm font-semibold">Applications</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${filtered.length} shown`}
            </p>
          </div>
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {!loading && filtered.length === 0 && !queueError && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                No applications in this filter.
              </li>
            )}
            {filtered.map((app) => {
              const active = selected?.id === app.id;
              return (
                <li key={app.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    className={[
                      "w-full text-left px-4 py-3 transition-colors",
                      active ? "bg-primary/5" : "hover:bg-muted/40",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <InstituteLogo
                          mark={app.payload.instituteName.slice(0, 2).toUpperCase()}
                          hue={200}
                          src={app.payload.logoPreview || null}
                          name={app.payload.instituteName}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">
                            {app.payload.instituteName}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {app.payload.principalName} · {app.payload.principalEmail}
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground/80 mt-1">
                            {app.referenceId}
                          </div>
                        </div>
                      </div>
                      <Pill tone={statusTone(app.status)}>{app.status}</Pill>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          {loading ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground flex flex-col items-center gap-3">
              <Loader2 className="size-5 animate-spin text-primary" />
              Loading registration details…
            </div>
          ) : !selected ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              {queueError
                ? "Registration details unavailable until the queue loads successfully."
                : "Select an application to review."}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <InstituteLogo
                    mark={selected.payload.instituteName.slice(0, 2).toUpperCase()}
                    hue={210}
                    src={selected.payload.logoPreview || null}
                    name={selected.payload.instituteName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold truncate">
                      {selected.payload.instituteName}
                    </h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                      {selected.referenceId}
                    </p>
                  </div>
                </div>
                <Pill tone={statusTone(selected.status)}>{selected.status}</Pill>
              </div>

              <div className="px-4 py-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <Detail
                    icon={MapPin}
                    label="Location"
                    value={`${selected.payload.city}, ${selected.payload.state}`}
                  />
                  <Detail
                    icon={Building2}
                    label="Type / Board"
                    value={`${selected.payload.instituteType} · ${selected.payload.educationBoard}`}
                  />
                  <Detail
                    icon={UserRound}
                    label="Principal"
                    value={`${selected.payload.principalName} (${selected.payload.principalDesignation})`}
                  />
                  <Detail icon={Mail} label="Email" value={selected.payload.principalEmail} />
                  <Detail icon={Phone} label="Mobile" value={selected.payload.principalMobile} />
                  <Detail
                    icon={CheckCircle2}
                    label={apiMode ? "Verification" : "OTP"}
                    value={
                      apiMode
                        ? "Manual offline review required before Approve/Reject"
                        : `Email ${selected.emailVerified ? "✓" : "—"} · Mobile ${selected.mobileVerified ? "✓" : "—"}`
                    }
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Address</div>
                  {selected.payload.address}, {selected.payload.city}, {selected.payload.state}{" "}
                  {selected.payload.pincode}, {selected.payload.country}
                  {selected.payload.website ? (
                    <div className="mt-1 truncate">{selected.payload.website}</div>
                  ) : null}
                </div>

                {selected.status === "pending" ? (
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-3 text-xs space-y-2">
                    <div className="font-medium text-foreground">Profile seeded on approval</div>
                    {(() => {
                      const seeded = publicProfileFromRegistrationSeed(
                        selected.payload.instituteName,
                        selected.payload,
                      );
                      return (
                        <div className="text-muted-foreground space-y-1">
                          <p>
                            <span className="text-foreground font-medium">Principal:</span>{" "}
                            {seeded.principal || "—"}
                          </p>
                          <p>
                            <span className="text-foreground font-medium">Contact:</span>{" "}
                            {[seeded.phone, seeded.email].filter(Boolean).join(" · ") || "—"}
                          </p>
                          <p className="line-clamp-3">
                            <span className="text-foreground font-medium">Address:</span>{" "}
                            {seeded.address || "—"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                ) : null}

                {selected.status === "rejected" && selected.rejectionReason && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs text-destructive">
                    {selected.rejectionReason}
                  </div>
                )}

                {selected.status === "approved" && selected.approvedInstituteId && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs">
                    Institute created:{" "}
                    <Link
                      to="/institutes/$id"
                      params={{ id: selected.approvedInstituteId }}
                      className="font-mono text-primary underline-offset-2 hover:underline"
                    >
                      {selected.approvedInstituteId}
                    </Link>
                  </div>
                )}

                {selected.status === "pending" && !queueError && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      variant="primary"
                      className="flex-1"
                      disabled={actionLoading}
                      onClick={() => {
                        setActionError(null);
                        setActionSuccess(null);
                        setApproveOpen(true);
                      }}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve & create institute
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={actionLoading}
                      onClick={() => {
                        setActionError(null);
                        setActionSuccess(null);
                        setRejectReason("");
                        setRejectOpen(true);
                      }}
                    >
                      <XCircle className="size-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        title="Approve registration"
        subtitle="Confirm only after you have manually verified this institute offline."
        footer={
          <>
            <Button variant="outline" disabled={actionLoading} onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={() => void handleApproveConfirm()}>
              Confirm approve
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            This will call{" "}
            <span className="font-mono text-foreground">POST /api/nexus/registrations/:id/approve</span>{" "}
            and provision the institute on the backend. There is no automatic verification step.
          </p>
          {selected && (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
              <div className="font-medium text-foreground">{selected.payload.instituteName}</div>
              <div className="text-xs mt-1">{selected.payload.principalName} · {selected.payload.principalEmail}</div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={rejectOpen}
        onClose={() => !actionLoading && setRejectOpen(false)}
        title="Reject registration"
        subtitle="Admin will see this reason on the pending-verification screen."
        footer={
          <>
            <Button variant="outline" disabled={actionLoading} onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={actionLoading} onClick={() => void handleRejectConfirm()}>
              Confirm reject
            </Button>
          </>
        }
      >
        <Field label={apiMode ? "Reason (required)" : "Reason"}>
          <TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={4}
            placeholder="e.g. Incomplete affiliation details"
          />
        </Field>
      </Modal>
    </AppShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
        <Icon className="size-3" />
        {label}
      </div>
      <div className="text-sm mt-1 break-words">{value}</div>
    </div>
  );
}
