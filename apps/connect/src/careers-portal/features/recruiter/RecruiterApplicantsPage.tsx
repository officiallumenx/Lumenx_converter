import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { SectionCard } from "@/components/app/SectionCard";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { ApplicationTimelineV2 } from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import {
  getApplicationById,
  getApplicationsForOrganization,
  updateApplicationStatusByRecruiter,
} from "@/lib/careers/repositories";
import { statusLabel, statusTone } from "@/lib/careers/status-utils";
import type { ApplicationStatus, JobApplication } from "@/lib/careers/types";

const PIPELINE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "shortlisted",
  "assessment",
  "demo_class",
  "interview_scheduled",
  "interview_completed",
  "offer_sent",
  "offer_accepted",
  "rejected",
  "on_hold",
];

export function RecruiterApplicantsPage() {
  const { user } = useCareersAuth();
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "all">("all");

  const apps = useMemo(
    () => (user?.organizationId ? getApplicationsForOrganization(user.organizationId) : []),
    [user?.organizationId, refresh],
  );

  if (!user?.organizationId) return null;

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const selected = selectedId ? getApplicationById(selectedId) : undefined;

  const updateStatus = (appId: string, status: ApplicationStatus) => {
    updateApplicationStatusByRecruiter(appId, status);
    setRefresh((n) => n + 1);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <CareersPageHeader
        title="Applicant pipeline"
        subtitle={`${apps.length} applications for ${user.organizationName ?? "your organization"}`}
        backTo="/careers/recruiter"
      />

      <div className="flex flex-wrap gap-2">
        <Select value={filter} onValueChange={(v) => setFilter(v as ApplicationStatus | "all")}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PIPELINE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <SectionCard title={`Applicants (${filtered.length})`} className="lg:col-span-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No applications yet for your open roles.
            </p>
          ) : (
            <div className="space-y-2">
              {filtered.map((app) => (
                <ApplicantRow
                  key={app.id}
                  app={app}
                  active={selectedId === app.id}
                  onSelect={() => setSelectedId(app.id)}
                  onStatusChange={(status) => updateStatus(app.id, status)}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <div className="lg:col-span-2">
          {selected ? (
            <SectionCard title="Application detail">
              <div className="space-y-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Candidate:</span> {selected.personal.name}
                </p>
                <p>
                  <span className="text-muted-foreground">Role:</span> {selected.jobTitle}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span> {selected.personal.email}
                </p>
                <p>
                  <span className="text-muted-foreground">Experience:</span>{" "}
                  {selected.professional.experienceYears} yrs
                </p>
                <p>
                  <span className="text-muted-foreground">Qualification:</span>{" "}
                  {selected.professional.highestQualification}
                </p>
                <Badge variant={statusTone(selected.status)}>{statusLabel(selected.status)}</Badge>
                <ApplicationTimelineV2
                  events={selected.timeline.slice(-5).map((e) => ({
                    id: e.id,
                    status: e.status,
                    label: e.label,
                    at: e.at,
                  }))}
                />
              </div>
            </SectionCard>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              Select an applicant to view details and timeline
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicantRow({
  app,
  active,
  onSelect,
  onStatusChange,
}: {
  app: JobApplication;
  active: boolean;
  onSelect: () => void;
  onStatusChange: (status: ApplicationStatus) => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
      onClick={onSelect}
      onKeyDown={(e) => e.key === "Enter" && onSelect()}
      role="button"
      tabIndex={0}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{app.personal.name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {app.jobTitle} · {app.id}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        <Select value={app.status} onValueChange={(v) => onStatusChange(v as ApplicationStatus)}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PIPELINE_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
