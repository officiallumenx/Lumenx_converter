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
  Building2,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  UserRound,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { setAdminBoundNexusInstituteId } from "@lumenx/config";
import {
  approveInstituteRegistration,
  ensureDemoPendingRegistration,
  listInstituteRegistrations,
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

export const Route = createFileRoute("/registrations")({
  head: () => ({ meta: [{ title: "Pending Registrations — LumenX Nexus" }] }),
  component: RegistrationsPage,
});

type StatusFilter = "all" | InstituteRegistrationStatus;

function statusTone(status: InstituteRegistrationStatus): "success" | "danger" | "neutral" {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "neutral";
}

function RegistrationsPage() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const [filter, setFilter] = useState<StatusFilter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    ensureDemoPendingRegistration();
    return subscribeInstituteRegistrations(() => setTick((t) => t + 1));
  }, []);

  const all = useMemo(() => listInstituteRegistrations(), [tick]);
  const pendingCount = useMemo(
    () => all.filter((a) => a.status === "pending").length,
    [all],
  );
  const approvedCount = useMemo(
    () => all.filter((a) => a.status === "approved").length,
    [all],
  );
  const rejectedCount = useMemo(
    () => all.filter((a) => a.status === "rejected").length,
    [all],
  );

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

  const handleApprove = (app: InstituteRegistrationApplication) => {
    setActionError(null);
    try {
      const defaults = defaultCreateForm();
      const created = createPlatformInstitute({
        ...defaults,
        name: app.payload.instituteName,
        city: app.payload.city,
        state: app.payload.state,
        country: app.payload.country || "India",
        addressLine: app.payload.address,
        pincode: app.payload.pincode,
        board: app.payload.educationBoard || defaults.board,
        instituteType: app.payload.instituteType || defaults.instituteType,
        contactEmail: app.payload.principalEmail,
        contactPhone: app.payload.principalMobile,
        logoUrl: app.payload.logoPreview || undefined,
        initialStatus: "trial",
        amountInr: 0,
      });
      approveInstituteRegistration(app.id, {
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
      setTick((t) => t + 1);
      void navigate({ to: "/institutes/$id", params: { id: created.id } });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Approve failed");
    }
  };

  const handleRejectConfirm = () => {
    if (!selected) return;
    setActionError(null);
    const reason = rejectReason.trim() || "Registration declined by Nexus";
    rejectInstituteRegistration(selected.id, {
      reason,
      reviewedBy: "Nexus Operator",
    });
    setRejectOpen(false);
    setRejectReason("");
    setTick((t) => t + 1);
  };

  return (
    <AppShell
      title="Registrations"
      subtitle="Admin self-registration queue · Approve creates the institute on Institutes and unlocks Admin"
    >
      <div className="mb-4 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-[12px] text-muted-foreground leading-relaxed">
        Admin signup appears here as <span className="font-medium text-foreground">Pending</span>{" "}
        (not on Institutes yet). Use the same host for both apps (
        <span className="font-mono text-foreground">localhost</span>, not{" "}
        <span className="font-mono text-foreground">127.0.0.1</span>
        ). Click <span className="font-medium text-foreground">Approve</span> to create the
        institute and open it.
      </div>
      <KpiGrid cols={4} className="mb-6">
        <Kpi label="Pending" value={String(pendingCount)} icon={<ClipboardList className="size-3.5" />} />
        <Kpi label="Approved" value={String(approvedCount)} tone="up" icon={<CheckCircle2 className="size-3.5" />} />
        <Kpi label="Rejected" value={String(rejectedCount)} tone={rejectedCount ? "down" : "neutral"} icon={<XCircle className="size-3.5" />} />
        <Kpi label="Total" value={String(all.length)} icon={<Building2 className="size-3.5" />} />
      </KpiGrid>

      <Card className="mb-4">
        <div className="px-3 sm:px-4 py-3">
          <PageToolbar className="border-0 bg-transparent px-0 py-0">
            <ToolbarGroup>
              <SegmentedControl
                value={filter}
                onChange={(v) => setFilter(v as StatusFilter)}
                options={[
                  { value: "pending", label: `Pending (${pendingCount})` },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "all", label: "All" },
                ]}
              />
            </ToolbarGroup>
            <ToolbarSpacer />
            <ToolbarMeta>
              Admin submissions sync via shared cookie on localhost · demo seed for review practice
            </ToolbarMeta>
          </PageToolbar>
        </div>
      </Card>

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
              {filtered.length} shown
            </p>
          </div>
          <ul className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && (
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
          {!selected ? (
            <div className="px-4 py-16 text-center text-sm text-muted-foreground">
              Select an application to review.
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
                  <Detail
                    icon={Mail}
                    label="Email"
                    value={selected.payload.principalEmail}
                  />
                  <Detail
                    icon={Phone}
                    label="Mobile"
                    value={selected.payload.principalMobile}
                  />
                  <Detail
                    icon={CheckCircle2}
                    label="OTP"
                    value={`Email ${selected.emailVerified ? "✓" : "—"} · Mobile ${selected.mobileVerified ? "✓" : "—"}`}
                  />
                </div>

                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Address</div>
                  {selected.payload.address}, {selected.payload.city},{" "}
                  {selected.payload.state} {selected.payload.pincode},{" "}
                  {selected.payload.country}
                  {selected.payload.website ? (
                    <div className="mt-1 truncate">{selected.payload.website}</div>
                  ) : null}
                </div>

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

                {selected.status === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleApprove(selected)}
                    >
                      <CheckCircle2 className="size-3.5" />
                      Approve & create institute
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
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
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject registration"
        subtitle="Admin will see this reason on the pending-verification screen."
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleRejectConfirm}>
              Confirm reject
            </Button>
          </>
        }
      >
        <Field label="Reason">
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
