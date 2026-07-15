import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  Card,
  Button,
  Pill,
  Kpi,
  Modal,
  Field,
  TextInput,
  Select,
  TextArea,
} from "@lumenx/ui-admin";
import { CAREER_JOBS, CAREER_CANDIDATES } from "@/lib/admin-module-data";
import {
  readAdminCareerSyncRows,
  persistAdminCareerStageChange,
  type AdminCareerStage,
  type AdminCareerSyncRow,
} from "@/lib/careers-sync";
import {
  readAdminContactInquiries,
  respondToContactInquiry,
  closeAdminContactInquiry,
  type AdminContactInquiry,
} from "@/lib/careers-inquiries";
import { Plus, Briefcase, Download, Search, Mail } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/careers")({
  head: () => ({ meta: [{ title: "Careers — LumenX Admin" }] }),
  component: CareersPage,
});

type CareerJob = (typeof CAREER_JOBS)[number];

type CandidateRow = {
  id: string;
  name: string;
  job: string;
  stage: AdminCareerStage;
  applied: string;
  score?: number;
  docs?: string;
  institute?: string;
};

const CAREER_SYNC_FALLBACK: AdminCareerSyncRow[] = CAREER_CANDIDATES.map((c, i) => ({
  id: c.id,
  name: c.name,
  role: c.job,
  institute: "LumenX Demo Institute",
  stage: c.stage as AdminCareerStage,
  applied: `${28 - i} May 2026`,
  docs: "3/4",
}));

function toCandidateRow(r: AdminCareerSyncRow, score?: number): CandidateRow {
  return {
    id: r.id,
    name: r.name,
    job: r.role,
    stage: r.stage,
    applied: r.applied,
    docs: r.docs,
    institute: r.institute,
    score,
  };
}

function CareersPage() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"jobs" | "candidates" | "inquiries">("jobs");
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState(CAREER_JOBS);
  const [candidates, setCandidates] = useState<CandidateRow[]>(() => {
    const synced = readAdminCareerSyncRows(CAREER_SYNC_FALLBACK);
    const scoreById = Object.fromEntries(CAREER_CANDIDATES.map((c) => [c.id, c.score]));
    return synced.map((r) => toCandidateRow(r, scoreById[r.id]));
  });
  const [inquiries, setInquiries] = useState<AdminContactInquiry[]>(() =>
    readAdminContactInquiries(),
  );
  const [selectedJob, setSelectedJob] = useState<CareerJob | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRow | null>(null);
  const [selectedInquiry, setSelectedInquiry] = useState<AdminContactInquiry | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Science");
  const [newType, setNewType] = useState("Full-time");

  const filteredJobs = useMemo(() => {
    if (!q) return jobs;
    return jobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q.toLowerCase()) ||
        j.dept.toLowerCase().includes(q.toLowerCase()),
    );
  }, [jobs, q]);

  const filteredCands = useMemo(() => {
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q.toLowerCase()) ||
        c.job.toLowerCase().includes(q.toLowerCase()),
    );
  }, [candidates, q]);

  const filteredInquiries = useMemo(() => {
    if (!q) return inquiries;
    const needle = q.toLowerCase();
    return inquiries.filter(
      (i) =>
        i.name.toLowerCase().includes(needle) ||
        i.subject.toLowerCase().includes(needle) ||
        i.email.toLowerCase().includes(needle) ||
        (i.instituteName?.toLowerCase().includes(needle) ?? false),
    );
  }, [inquiries, q]);

  const activeList =
    tab === "jobs" ? filteredJobs : tab === "candidates" ? filteredCands : filteredInquiries;

  const refreshInquiries = () => setInquiries(readAdminContactInquiries());

  const sendReply = () => {
    if (!selectedInquiry || !replyBody.trim()) return;
    const from = selectedInquiry.instituteName
      ? `${selectedInquiry.instituteName} HR`
      : "LumenX Careers Desk";
    if (respondToContactInquiry(selectedInquiry.id, replyBody, from)) {
      refreshInquiries();
      setSelectedInquiry(
        readAdminContactInquiries().find((i) => i.id === selectedInquiry.id) ?? null,
      );
      setReplyBody("");
    }
  };

  const publishJob = () => {
    if (!newTitle.trim()) return;
    setJobs((p) => [
      ...p,
      {
        id: `JOB-${Date.now()}`,
        title: newTitle.trim(),
        dept: newDept,
        applicants: 0,
        status: "open" as const,
      },
    ]);
    setNewTitle("");
    setOpen(false);
  };

  const updateCandidateStage = (id: string, stage: AdminCareerStage) => {
    if (persistAdminCareerStageChange(id, stage)) {
      setCandidates((prev) => prev.map((x) => (x.id === id ? { ...x, stage } : x)));
      setSelectedCandidate((prev) => (prev?.id === id ? { ...prev, stage } : prev));
    }
  };

  return (
    <AppShell
      title="Careers Management"
      subtitle="Job posts & hiring pipeline · Connect Careers portal"
      actions={
        <>
          <Button>
            <Download className="size-3.5" /> Reports
          </Button>
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Plus className="size-3.5" /> Post job
          </Button>
        </>
      }
    >
      <div className="lx-kpi-grid">
        <Kpi
          label="Open roles"
          value={String(jobs.filter((j) => j.status === "open").length)}
          icon={<Briefcase className="size-3.5" />}
        />
        <Kpi label="Candidates" value={String(candidates.length)} delta="Active pipeline" />
        <Kpi
          label="Interviews"
          value={String(candidates.filter((c) => c.stage === "interview").length)}
          delta="This week"
        />
        <Kpi
          label="Hired YTD"
          value={String(candidates.filter((c) => c.stage === "hired").length)}
          tone="up"
        />
        <Kpi
          label="Open inquiries"
          value={String(inquiries.filter((i) => i.status === "open").length)}
          icon={<Mail className="size-3.5" />}
        />
      </div>

      <Card className="mt-6">
        <div className="p-5 border-b border-border flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {(["jobs", "candidates", "inquiries"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setQ("");
                }}
                className={`px-3 h-8 rounded text-[11px] font-medium capitalize transition-colors ${
                  tab === t
                    ? "bg-surface border border-border text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                tab === "jobs"
                  ? "Search title or department…"
                  : tab === "candidates"
                    ? "Search name or role…"
                    : "Search inquiries…"
              }
              className="w-full h-9 pl-9 pr-3 rounded-md bg-background border border-border text-xs focus:outline-none focus:border-primary/40"
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono ml-auto">
            {activeList.length} results
          </div>
        </div>

        {tab === "jobs" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Role</th>
                    <th className="px-5 py-3 font-semibold">Department</th>
                    <th className="px-5 py-3 font-semibold">Applicants</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredJobs.map((j) => (
                    <tr
                      key={j.id}
                      className="hover:bg-surface-hover cursor-pointer"
                      onClick={() => setSelectedJob(j)}
                    >
                      <td className="px-5 py-3 text-xs font-medium">{j.title}</td>
                      <td className="px-5 py-3 text-xs">{j.dept}</td>
                      <td className="px-5 py-3 text-xs">{j.applicants}</td>
                      <td className="px-5 py-3">
                        <Pill
                          tone={
                            j.status === "open"
                              ? "success"
                              : j.status === "interview"
                                ? "warning"
                                : "info"
                          }
                        >
                          {j.status}
                        </Pill>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedJob(j);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing 1–{filteredJobs.length} of {filteredJobs.length}
              </span>
              <div className="flex gap-1">
                <Button size="sm" disabled>
                  Previous
                </Button>
                <Button size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {tab === "candidates" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">Candidate</th>
                    <th className="px-5 py-3 font-semibold">Applied for</th>
                    <th className="px-5 py-3 font-semibold">Stage</th>
                    <th className="px-5 py-3 font-semibold">Applied</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCands.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-surface-hover cursor-pointer"
                      onClick={() => setSelectedCandidate(c)}
                    >
                      <td className="px-5 py-3 text-xs font-medium">{c.name}</td>
                      <td className="px-5 py-3 text-xs">{c.job}</td>
                      <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={c.stage}
                          onChange={(e) => {
                            updateCandidateStage(c.id, e.target.value as AdminCareerStage);
                          }}
                          className="h-8 text-xs"
                        >
                          {(
                            [
                              "review",
                              "shortlist",
                              "assessment",
                              "demo",
                              "interview",
                              "offer",
                              "hired",
                              "rejected",
                              "hold",
                            ] as AdminCareerStage[]
                          ).map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono">{c.applied}</td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCandidate(c);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing 1–{filteredCands.length} of {filteredCands.length}
              </span>
              <div className="flex gap-1">
                <Button size="sm" disabled>
                  Previous
                </Button>
                <Button size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}

        {tab === "inquiries" && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground bg-background/40 border-b border-border">
                    <th className="px-5 py-3 font-semibold">ID</th>
                    <th className="px-5 py-3 font-semibold">From</th>
                    <th className="px-5 py-3 font-semibold">Subject</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Routing</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInquiries.map((i) => (
                    <tr
                      key={i.id}
                      className="hover:bg-surface-hover cursor-pointer"
                      onClick={() => {
                        setSelectedInquiry(i);
                        setReplyBody("");
                      }}
                    >
                      <td className="px-5 py-3 text-xs font-mono">{i.id}</td>
                      <td className="px-5 py-3 text-xs">
                        <p className="font-medium">{i.name}</p>
                        <p className="text-muted-foreground">{i.email}</p>
                      </td>
                      <td className="px-5 py-3 text-xs max-w-[200px] truncate">{i.subject}</td>
                      <td className="px-5 py-3 text-xs capitalize">
                        {i.category.replace(/_/g, " ")}
                      </td>
                      <td className="px-5 py-3 text-xs">
                        {i.applicationId
                          ? `${i.instituteName ?? "Institute"} · ${i.applicationId}`
                          : (i.instituteName ?? "Platform desk")}
                      </td>
                      <td className="px-5 py-3">
                        <Pill
                          tone={
                            i.status === "open"
                              ? "warning"
                              : i.status === "answered"
                                ? "success"
                                : "info"
                          }
                        >
                          {i.status}
                        </Pill>
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(i);
                            setReplyBody("");
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredInquiries.length === 0 && (
              <p className="px-5 py-8 text-xs text-muted-foreground text-center">
                No contact inquiries yet. They appear when candidates use Connect Careers Contact
                HR.
              </p>
            )}
            <div className="px-5 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Showing {filteredInquiries.length} inquiries</span>
              <Button size="sm" variant="outline" onClick={refreshInquiries}>
                Refresh
              </Button>
            </div>
          </>
        )}
      </Card>

      <Modal
        open={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        title={selectedJob?.title ?? "Job posting"}
        subtitle={selectedJob ? `${selectedJob.id} · ${selectedJob.dept}` : undefined}
        size="lg"
        footer={
          selectedJob ? (
            <>
              <Button onClick={() => setSelectedJob(null)}>Close</Button>
              <Button variant="primary" onClick={() => setSelectedJob(null)}>
                Manage posting
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedJob && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill
                tone={
                  selectedJob.status === "open"
                    ? "success"
                    : selectedJob.status === "interview"
                      ? "warning"
                      : "info"
                }
              >
                {selectedJob.status}
              </Pill>
              <span className="text-xs text-muted-foreground">{selectedJob.dept}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-md border border-border bg-background/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Applicants
                </div>
                <div className="font-medium mt-1">{selectedJob.applicants}</div>
              </div>
              <div className="p-3 rounded-md border border-border bg-background/40">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Published on Connect
                </div>
                <div className="font-medium mt-1">Yes</div>
              </div>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Open role on the Connect Careers portal. Candidates apply through the public job
              listing and sync into this pipeline automatically.
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title={selectedCandidate?.name ?? "Candidate"}
        subtitle={
          selectedCandidate ? `${selectedCandidate.id} · ${selectedCandidate.job}` : undefined
        }
        size="lg"
        footer={
          selectedCandidate ? (
            <>
              <Button onClick={() => setSelectedCandidate(null)}>Close</Button>
              {selectedCandidate.stage !== "hired" && selectedCandidate.stage !== "rejected" && (
                <Button
                  variant="primary"
                  onClick={() => updateCandidateStage(selectedCandidate.id, "interview")}
                >
                  Schedule interview
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {selectedCandidate && (
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="info">{selectedCandidate.stage}</Pill>
              {selectedCandidate.score != null && (
                <span className="text-xs text-muted-foreground">
                  Score {selectedCandidate.score.toFixed(1)} / 5
                </span>
              )}
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Applied for</span>
                <span>{selectedCandidate.job}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Applied</span>
                <span>{selectedCandidate.applied}</span>
              </div>
              {selectedCandidate.institute && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Institute</span>
                  <span>{selectedCandidate.institute}</span>
                </div>
              )}
              {selectedCandidate.docs && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">Documents</span>
                  <span>{selectedCandidate.docs} verified</span>
                </div>
              )}
            </div>
            <Field label="Pipeline stage">
              <Select
                value={selectedCandidate.stage}
                onChange={(e) =>
                  updateCandidateStage(selectedCandidate.id, e.target.value as AdminCareerStage)
                }
              >
                {(
                  [
                    "review",
                    "shortlist",
                    "assessment",
                    "demo",
                    "interview",
                    "offer",
                    "hired",
                    "rejected",
                    "hold",
                  ] as AdminCareerStage[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={!!selectedInquiry}
        onClose={() => setSelectedInquiry(null)}
        title={selectedInquiry ? `Inquiry ${selectedInquiry.id}` : "Inquiry"}
        size="lg"
        footer={
          selectedInquiry ? (
            <>
              <Button
                onClick={() => {
                  if (selectedInquiry && closeAdminContactInquiry(selectedInquiry.id)) {
                    refreshInquiries();
                    setSelectedInquiry(null);
                  }
                }}
              >
                Close inquiry
              </Button>
              <Button variant="primary" onClick={sendReply} disabled={!replyBody.trim()}>
                Send reply
              </Button>
            </>
          ) : undefined
        }
      >
        {selectedInquiry && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">{selectedInquiry.subject}</p>
              <p className="text-xs text-muted-foreground mt-1 capitalize">
                {selectedInquiry.category.replace(/_/g, " ")} · {selectedInquiry.status}
              </p>
            </div>
            <p className="text-muted-foreground">{selectedInquiry.message}</p>
            {selectedInquiry.responses.map((r) => (
              <div key={r.id} className="rounded-lg border border-border p-3 bg-surface">
                <p className="text-xs font-medium">{r.from}</p>
                <p className="mt-1">{r.body}</p>
              </div>
            ))}
            <Field label="Reply">
              <TextArea
                rows={4}
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Type HR response…"
              />
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Post new job"
        size="lg"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={publishJob}>
              Publish
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Job title" required>
            <TextInput
              placeholder="Physics Teacher"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </Field>
          <Field label="Department">
            <Select value={newDept} onChange={(e) => setNewDept(e.target.value)}>
              <option>Science</option>
              <option>Administration</option>
              <option>Sports</option>
              <option>Arts</option>
            </Select>
          </Field>
          <Field label="Employment type">
            <Select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
            </Select>
          </Field>
          <Field label="Publish to Connect">
            <Select>
              <option>Yes</option>
              <option>Draft</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </AppShell>
  );
}
