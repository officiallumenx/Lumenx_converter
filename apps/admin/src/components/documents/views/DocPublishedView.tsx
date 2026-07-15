import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Field,
  KpiGrid,
  Kpi,
  Modal,
  PageStack,
  PageToolbar,
  Pill,
  SearchInput,
  SegmentedControl,
  TextArea,
} from "@lumenx/ui-admin";
import {
  getPublishedDocumentGroups,
  compareVersions,
  restoreVersion,
  createNewVersion,
  updatePortalVisibility,
} from "@/lib/template-management/store";
import type { GeneratedDocument, PortalVisibility, VersionDiff } from "@/lib/template-management/types";
import {
  ArrowLeftRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  GitBranch,
  Globe,
  GraduationCap,
  History,
  Mail,
  Monitor,
  Plus,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Star,
  Users,
  Wand2,
  X,
  XCircle,
} from "lucide-react";
import { IconChip } from "@/components/IconChip";
import { Link } from "@tanstack/react-router";

// ─── Constants ────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<string, string> = {
  certificate: "Certificate", report: "Report",
  document: "Document", id_card: "ID Card",
};
const KIND_COLOR: Record<string, string> = {
  certificate: "bg-amber-500/10 text-amber-600",
  report: "bg-blue-500/10 text-blue-600",
  document: "bg-slate-500/10 text-slate-600",
  id_card: "bg-indigo-500/10 text-indigo-600",
};

const PORTAL_META = {
  student: { label: "Student Portal", short: "Student", icon: GraduationCap },
  parent: { label: "Parent Portal", short: "Parent", icon: Users },
  teacher: { label: "Teacher Portal", short: "Teacher", icon: BookOpen },
} as const;

const CHANNEL_META = {
  in_app: { icon: Monitor, label: "In-app" },
  email: { icon: Mail, label: "Email" },
  sms: { icon: Smartphone, label: "SMS" },
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtFull(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Version badge ────────────────────────────────────────────────────────────

function VersionBadge({ v, current }: { v: number; current: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
      current
        ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/25"
        : "bg-muted text-muted-foreground border-border"
    }`}>
      v{v}
      {current && <Star className="size-2.5 fill-emerald-500 text-emerald-500" />}
    </span>
  );
}

// ─── Portal toggle ────────────────────────────────────────────────────────────

function PortalToggle({ portal, active, onToggle }: { portal: keyof PortalVisibility; active: boolean; onToggle: () => void }) {
  const meta = PORTAL_META[portal];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-semibold transition-all ${
        active ? "border-primary/30 bg-primary/5 text-foreground" : "text-muted-foreground border-border bg-muted/30 hover:border-border-strong"
      }`}
    >
      <IconChip icon={Icon} size="xs" variant="soft" active={active} />
      {meta.short}
      {active ? <CheckCircle2 className="size-2.5" /> : <X className="size-2.5 opacity-40" />}
    </button>
  );
}

// ─── Compare versions modal ───────────────────────────────────────────────────

function CompareModal({ diff, onClose }: { diff: VersionDiff; onClose: () => void }) {
  return (
    <Modal
      open
      onClose={onClose}
      title="Compare versions"
      subtitle={`${diff.older.templateName} · ${diff.older.recipientName}`}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Access control note */}
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15 text-[10px] text-blue-600">
          <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
          <span>
            <strong>Admin view only.</strong> Students, parents, and teachers only see{" "}
            <strong>v{Math.max(diff.older.versionNumber, diff.newer.versionNumber)} (current)</strong>.
            Previous versions are not accessible from portals.
          </span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Field</span>
          <span className="text-center">
            <VersionBadge v={diff.older.versionNumber} current={false} />
          </span>
          <span className="text-center">
            <VersionBadge v={diff.newer.versionNumber} current={diff.newer.isCurrentVersion} />
          </span>
        </div>

        {/* Diff rows */}
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {diff.fields.map((f) => (
            <div key={f.field} className={`grid grid-cols-[1fr_1fr_1fr] gap-0 text-xs ${f.changed ? "bg-amber-500/5" : ""}`}>
              <div className="px-3 py-2.5 font-medium text-muted-foreground border-r border-border">{f.label}</div>
              <div className={`px-3 py-2.5 border-r border-border ${f.changed ? "text-red-600 line-through opacity-70" : ""}`}>
                {f.oldValue}
              </div>
              <div className={`px-3 py-2.5 ${f.changed ? "text-emerald-700 font-semibold" : ""}`}>
                {f.newValue}
                {f.changed && <span className="ml-1 text-[9px] font-normal text-emerald-600">changed</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        {(() => {
          const changed = diff.fields.filter((f) => f.changed).length;
          return (
            <p className="text-[10px] text-muted-foreground">
              {changed} field{changed !== 1 ? "s" : ""} differ between these versions.
            </p>
          );
        })()}
      </div>
    </Modal>
  );
}

// ─── Restore version modal ────────────────────────────────────────────────────

function RestoreModal({ doc, onConfirm, onClose }: { doc: GeneratedDocument; onConfirm: (reason: string) => void; onClose: () => void }) {
  const [reason, setReason] = useState(`Restore to v${doc.versionNumber} — ${doc.versionChanges || "original issue"}`);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Restore to v${doc.versionNumber}`}
      subtitle={`${doc.templateName} · ${doc.recipientName}`}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            <RotateCcw className="size-3.5" /> Restore this version
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-700">
          <XCircle className="size-3.5 mt-0.5 shrink-0" />
          Restoring v{doc.versionNumber} will make it the current version visible in portals.
          The current version will be demoted to a non-current state but retained in history.
        </div>
        <Field label="Restore reason" hint="Visible in workflow history" required>
          <TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── New version modal ────────────────────────────────────────────────────────

function NewVersionModal({ groupId, currentVersion, onConfirm, onClose }: {
  groupId: string;
  currentVersion: GeneratedDocument;
  onConfirm: (changeNote: string) => void;
  onClose: () => void;
}) {
  const [changeNote, setChangeNote] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={`Create v${currentVersion.versionNumber + 1}`}
      subtitle={`${currentVersion.templateName} · ${currentVersion.recipientName}`}
      size="sm"
      footer={
        <div className="flex gap-2 justify-end w-full">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => onConfirm(changeNote)} disabled={!changeNote.trim()}>
            <Plus className="size-3.5" /> Create draft v{currentVersion.versionNumber + 1}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/15 text-xs text-blue-600">
          <GitBranch className="size-3.5 mt-0.5 shrink-0" />
          A new draft version will be created from v{currentVersion.versionNumber}. It must go through the
          full approval workflow before becoming the published version.
        </div>
        <Field label="What is changing?" required>
          <TextArea
            placeholder="e.g. Correcting Physics marks from 72 to 79 as per re-evaluation result"
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            rows={3}
            autoFocus
          />
        </Field>
      </div>
    </Modal>
  );
}

// ─── Version history panel (inside detail) ────────────────────────────────────

function VersionHistoryPanel({
  versions,
  onRestore,
  onCompare,
}: {
  versions: GeneratedDocument[];
  onRestore: (doc: GeneratedDocument) => void;
  onCompare: (older: GeneratedDocument, newer: GeneratedDocument) => void;
}) {
  const [compareFrom, setCompareFrom] = useState<string | null>(null);

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  const current = sorted.find((v) => v.isCurrentVersion);

  return (
    <div className="space-y-3">
      {/* Access control banner */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 text-[10px] text-primary">
        <ShieldCheck className="size-3 mt-0.5 shrink-0" />
        <div>
          <strong>Admin-only view.</strong> Portal users (students, parents, teachers) see only{" "}
          {current ? <strong>v{current.versionNumber} (current)</strong> : "the latest published version"}.
        </div>
      </div>

      {/* Compare mode hint */}
      {sorted.length >= 2 && (
        <p className="text-[10px] text-muted-foreground">
          {compareFrom
            ? `Select another version to compare with v${sorted.find((v) => v.id === compareFrom)?.versionNumber ?? "?"}`
            : "Click a version's Compare button to diff two versions side by side."}
        </p>
      )}

      {/* Version timeline */}
      <div className="space-y-3">
        {sorted.map((ver, i) => (
          <div key={ver.id} className={`rounded-xl border p-3 flex flex-col gap-2 transition-colors ${
            ver.isCurrentVersion ? "border-emerald-500/30 bg-emerald-500/5" :
            ver.workflowState === "rejected" ? "border-red-500/20 bg-red-500/5 opacity-70" :
            compareFrom === ver.id ? "border-primary/40 bg-primary/5" : "border-border bg-background"
          }`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <VersionBadge v={ver.versionNumber} current={ver.isCurrentVersion} />
                {ver.workflowState === "rejected" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-medium">Rejected</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground">{fmt(ver.publishedAt)}</div>
            </div>

            {/* Changes */}
            <p className="text-xs font-medium">{ver.versionChanges || "Initial issue"}</p>
            {ver.versionNote && (
              <p className="text-[10px] text-muted-foreground italic">{ver.versionNote}</p>
            )}

            {/* Meta */}
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <div>Generated by {ver.generatedBy}</div>
              {ver.publishedAt && (
                <div>
                  Published by {ver.workflowHistory.filter((h) => h.state === "published").slice(-1)[0]?.actor ?? "—"}
                  {" · "}{ver.certificateNumber ?? ""}
                </div>
              )}
            </div>

            {/* Actions */}
            {!ver.isCurrentVersion && ver.workflowState !== "rejected" && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (compareFrom && compareFrom !== ver.id) {
                      const other = sorted.find((v) => v.id === compareFrom)!;
                      const olderVer = other.versionNumber < ver.versionNumber ? other : ver;
                      const newerVer = other.versionNumber > ver.versionNumber ? other : ver;
                      onCompare(olderVer, newerVer);
                      setCompareFrom(null);
                    } else {
                      setCompareFrom(compareFrom === ver.id ? null : ver.id);
                    }
                  }}
                  className={compareFrom === ver.id ? "text-primary bg-primary/5" : ""}
                >
                  <ArrowLeftRight className="size-3" />
                  {compareFrom && compareFrom !== ver.id ? "Compare with this" : "Compare"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onRestore(ver)} className="text-amber-600 hover:bg-amber-500/10">
                  <RotateCcw className="size-3" /> Restore this version
                </Button>
              </div>
            )}

            {/* Compare with current shortcut */}
            {ver.isCurrentVersion && sorted.length >= 2 && (
              <div className="flex items-center gap-2 pt-1 border-t border-border/60">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const prev = sorted.find((v) => !v.isCurrentVersion && v.workflowState !== "rejected");
                    if (prev) onCompare(prev, ver);
                  }}
                >
                  <ArrowLeftRight className="size-3" /> Compare with previous
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Detail slide-over ────────────────────────────────────────────────────────

type DetailTab = "info" | "versions" | "notifications";

function DocDetailPanel({
  groupData,
  onTogglePortal,
  onRestore,
  onCompare,
  onNewVersion,
  onClose,
}: {
  groupData: { groupId: string; current: GeneratedDocument; versions: GeneratedDocument[]; totalVersions: number };
  onTogglePortal: (portal: keyof PortalVisibility) => void;
  onRestore: (doc: GeneratedDocument) => void;
  onCompare: (older: GeneratedDocument, newer: GeneratedDocument) => void;
  onNewVersion: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("info");
  const doc = groupData.current;
  const allNotifs = doc.notifications;

  return (
    <div className="fixed inset-y-0 right-0 z-30 w-full max-w-lg shadow-2xl border-l border-border bg-background flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-semibold text-sm truncate">{doc.templateName}</p>
            <VersionBadge v={doc.versionNumber} current />
          </div>
          <p className="text-xs text-muted-foreground">{doc.recipientName} · {doc.recipientRef}</p>
        </div>
        <button type="button" onClick={onClose} className="size-8 rounded-lg flex items-center justify-center hover:bg-surface-hover text-muted-foreground">
          <X className="size-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {([
          { tab: "info", label: "Info" },
          { tab: "versions", label: `Versions (${groupData.totalVersions})` },
          { tab: "notifications", label: `Notifications (${allNotifs.length})` },
        ] as { tab: DetailTab; label: string }[]).map(({ tab: t, label }) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* ── Info tab ─────────────────────────────────────────────────────── */}
        {tab === "info" && (
          <>
            {/* Portal visibility */}
            <section>
              <p className="text-xs font-semibold mb-3">Portal visibility</p>
              <div className="flex flex-wrap gap-2">
                {(["student", "parent", "teacher"] as const).map((portal) => (
                  <PortalToggle
                    key={portal}
                    portal={portal}
                    active={doc.portalVisibility[portal]}
                    onToggle={() => onTogglePortal(portal)}
                  />
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">
                Portal users see only the current version (v{doc.versionNumber}).
              </p>
            </section>

            {/* Mock portal status */}
            <section>
              <p className="text-xs font-semibold mb-3">Live portal integration</p>
              <div className="space-y-2">
                {(["student", "parent", "teacher"] as const).filter((p) => doc.portalVisibility[p]).map((portal) => {
                  const meta = PORTAL_META[portal];
                  const Icon = meta.icon;
                  return (
                    <div key={portal} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/20 bg-primary/5">
                      <IconChip icon={Icon} size="sm" variant="soft" />
                      <div className="flex-1">
                        <p className="text-xs font-semibold">{meta.label}</p>
                        <p className="text-[10px] opacity-70">v{doc.versionNumber} visible to {doc.recipientName}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-semibold opacity-60">
                        <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </div>
                    </div>
                  );
                })}
                {!Object.values(doc.portalVisibility).some(Boolean) && (
                  <p className="text-xs text-muted-foreground text-center py-4">No portals enabled for this document.</p>
                )}
              </div>
            </section>

            {/* Metadata */}
            <section className="grid grid-cols-2 gap-3">
              {[
                { label: "Generated by", value: doc.generatedBy },
                { label: "Generated on", value: fmt(doc.generatedAt) },
                { label: "Published on", value: fmtFull(doc.publishedAt) },
                { label: "Cert / Doc no.", value: doc.certificateNumber ?? "—" },
                { label: "Notifications", value: `${doc.notificationCount} sent` },
                { label: "Batch", value: doc.batchId ?? "—" },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                  <p className="text-xs font-medium mt-0.5 font-mono">{value}</p>
                </div>
              ))}
            </section>
          </>
        )}

        {/* ── Versions tab ─────────────────────────────────────────────────── */}
        {tab === "versions" && (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold">Version history</p>
              <Button size="sm" onClick={onNewVersion}>
                <Plus className="size-3.5" /> New version
              </Button>
            </div>
            <VersionHistoryPanel
              versions={groupData.versions}
              onRestore={onRestore}
              onCompare={onCompare}
            />
          </>
        )}

        {/* ── Notifications tab ─────────────────────────────────────────────── */}
        {tab === "notifications" && (
          <div className="space-y-2">
            {allNotifs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No notifications for this document.</p>
            ) : (
              allNotifs.map((n) => {
                const portalMeta = PORTAL_META[n.recipientPortal];
                const channelMeta = CHANNEL_META[n.channel];
                const PortalIcon = portalMeta.icon;
                const ChanIcon = channelMeta.icon;
                return (
                  <div key={n.id} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-background">
                    <div className="size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 bg-primary text-primary-foreground">
                      {n.recipientName[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{n.recipientName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border font-medium border-primary/20 bg-primary/5">
                          <IconChip icon={PortalIcon} size="xs" variant="soft" />
                          {portalMeta.short}
                        </span>
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <ChanIcon className="size-2.5" /> {channelMeta.label}
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground/60 mt-0.5">{fmtFull(n.sentAt)}</p>
                    </div>
                    <div className="shrink-0">
                      {n.readAt ? (
                        <span className="text-[9px] text-emerald-600 flex items-center gap-0.5 font-medium">
                          <Check className="size-2.5" /> Read
                        </span>
                      ) : (
                        <span className="text-[9px] text-muted-foreground">Unread</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Published document card ──────────────────────────────────────────────────

function PublishedDocCard({
  groupData,
  onTogglePortal,
  onOpen,
}: {
  groupData: { groupId: string; current: GeneratedDocument; versions: GeneratedDocument[]; totalVersions: number };
  onTogglePortal: (portal: keyof PortalVisibility) => void;
  onOpen: () => void;
}) {
  const doc = groupData.current;
  const hasMultipleVersions = groupData.totalVersions > 1;

  return (
    <div className="rounded-xl border border-border bg-surface hover:border-border-strong hover:shadow-sm transition-all duration-150 flex flex-col">
      <div className="p-4 flex-1 space-y-3">
        <div className="flex items-start gap-3">
          <IconChip icon={FileText} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm truncate">{doc.templateName}</p>
              <VersionBadge v={doc.versionNumber} current />
              {hasMultipleVersions && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <History className="size-2.5" /> {groupData.totalVersions} versions
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{doc.recipientName}</p>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${KIND_COLOR[doc.kind]}`}>
            {KIND_LABEL[doc.kind]}
          </span>
        </div>

        {doc.versionChanges && (
          <p className="text-[10px] text-muted-foreground italic border-l-2 border-border pl-2">{doc.versionChanges}</p>
        )}

        {/* Portal toggles */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Portals</p>
          <div className="flex flex-wrap gap-1.5">
            {(["student", "parent", "teacher"] as const).map((portal) => (
              <PortalToggle
                key={portal}
                portal={portal}
                active={doc.portalVisibility[portal]}
                onToggle={() => onTogglePortal(portal)}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bell className="size-3" /> {doc.notificationCount} notification{doc.notificationCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {fmt(doc.publishedAt)}
          </span>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border/60 flex gap-1 justify-end">
        {hasMultipleVersions && (
          <Button size="sm" variant="ghost" onClick={onOpen}>
            <History className="size-3.5" /> {groupData.totalVersions} versions
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onOpen}>
          <Eye className="size-3.5" /> Details
        </Button>
      </div>
    </div>
  );
}

// ─── Notification feed ────────────────────────────────────────────────────────

function NotificationFeed({ groups }: { groups: ReturnType<typeof getPublishedDocumentGroups> }) {
  const allNotifs = useMemo(
    () =>
      groups
        .flatMap((g) => g.current.notifications.map((n) => ({ ...n, docKind: g.current.kind })))
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()),
    [groups],
  );

  if (allNotifs.length === 0) {
    return (
      <div className="py-12 text-center">
        <Bell className="size-10 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allNotifs.map((n) => {
        const portalMeta = PORTAL_META[n.recipientPortal];
        const channelMeta = CHANNEL_META[n.channel];
        const PortalIcon = portalMeta.icon;
        const ChanIcon = channelMeta.icon;
        return (
          <div key={n.id} className="flex items-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:border-border-strong transition-colors">
            <div className="size-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-primary text-primary-foreground">
              {n.recipientName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{n.recipientName}</p>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium border-primary/20 bg-primary/5">
                  <IconChip icon={PortalIcon} size="xs" variant="soft" />
                  {portalMeta.label}
                </span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <ChanIcon className="size-2.5" /> {channelMeta.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{n.documentName}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{fmtFull(n.sentAt)}</p>
            </div>
            <div className="shrink-0 text-right">
              {n.readAt ? (
                <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 font-medium">
                  <Check className="size-2.5" /> Read
                </span>
              ) : (
                <span className="text-[10px] text-muted-foreground">Unread</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Portal status panel ──────────────────────────────────────────────────────

function PortalStatusPanel({ groups }: { groups: ReturnType<typeof getPublishedDocumentGroups> }) {
  const stats = useMemo(() => ({
    student: groups.filter((g) => g.current.portalVisibility.student).length,
    parent: groups.filter((g) => g.current.portalVisibility.parent).length,
    teacher: groups.filter((g) => g.current.portalVisibility.teacher).length,
  }), [groups]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {(["student", "parent", "teacher"] as const).map((portal) => {
        const meta = PORTAL_META[portal];
        const Icon = meta.icon;
        return (
          <div key={portal} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
            <IconChip icon={Icon} size="md" variant="soft" />
            <div className="min-w-0">
              <p className="text-xs font-semibold">{meta.label}</p>
              <p className="text-xl font-bold mt-0.5">{stats[portal]}</p>
              <p className="text-[10px] opacity-70">current versions visible</p>
            </div>
            <div className="ml-auto flex items-center gap-1 text-[10px] font-semibold opacity-70">
              <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

type Tab = "documents" | "notifications";
type KindFilter = GeneratedDocument["kind"] | "all";

export function DocPublishedView() {
  const [groups, setGroups] = useState(() => getPublishedDocumentGroups());
  const [activeTab, setActiveTab] = useState<Tab>("documents");
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [detailGroupId, setDetailGroupId] = useState<string | null>(null);

  // Modals
  const [compareModal, setCompareModal] = useState<VersionDiff | null>(null);
  const [restoreModal, setRestoreModal] = useState<GeneratedDocument | null>(null);
  const [newVersionModal, setNewVersionModal] = useState<{ groupId: string; current: GeneratedDocument } | null>(null);

  const refresh = () => setGroups(getPublishedDocumentGroups());

  const detailGroup = detailGroupId ? groups.find((g) => g.groupId === detailGroupId) ?? null : null;

  const handleTogglePortal = (groupId: string, portal: keyof PortalVisibility) => {
    const group = groups.find((g) => g.groupId === groupId);
    if (!group) return;
    updatePortalVisibility(group.current.id, { [portal]: !group.current.portalVisibility[portal] });
    refresh();
  };

  const handleRestore = (doc: GeneratedDocument, reason: string) => {
    restoreVersion(doc.id, "Admin User", reason);
    setRestoreModal(null);
    refresh();
  };

  const handleNewVersion = (groupId: string, changeNote: string) => {
    createNewVersion(groupId, "Admin User", changeNote);
    setNewVersionModal(null);
    refresh();
  };

  const handleCompare = (older: GeneratedDocument, newer: GeneratedDocument) => {
    const diff = compareVersions(older.id, newer.id);
    if (diff) setCompareModal(diff);
  };

  const totalNotifs = useMemo(() => groups.reduce((a, g) => a + g.current.notifications.length, 0), [groups]);
  const readNotifs = useMemo(() => groups.flatMap((g) => g.current.notifications).filter((n) => n.readAt !== null).length, [groups]);
  const multiVersionGroups = useMemo(() => groups.filter((g) => g.totalVersions > 1).length, [groups]);

  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      if (kindFilter !== "all" && g.current.kind !== kindFilter) return false;
      if (q) {
        const lq = q.toLowerCase();
        return [g.current.templateName, g.current.recipientName, g.current.recipientRef, g.current.certificateNumber ?? ""].join(" ").toLowerCase().includes(lq);
      }
      return true;
    });
  }, [groups, kindFilter, q]);

  return (
    <PageStack>
      {/* KPIs */}
      <KpiGrid cols={4}>
        <Kpi label="Published documents" value={String(groups.length)} tone="up" />
        <Kpi label="Multi-version documents" value={String(multiVersionGroups)} tone="neutral" />
        <Kpi label="Notifications sent" value={String(totalNotifs)} tone="neutral" />
        <Kpi label="Read by recipients" value={String(readNotifs)} tone="up" />
      </KpiGrid>

      {/* Portal status */}
      <PortalStatusPanel groups={groups} />

      {/* Main card */}
      <Card>
        {/* Tabs */}
        <div className="px-4 pt-4 pb-0 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1">
            {([
              { tab: "documents", label: `Documents (${groups.length})` },
              { tab: "notifications", label: `Notifications (${totalNotifs})` },
            ] as { tab: Tab; label: string }[]).map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
                  activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link to="/documents" search={{ view: "generate" }}>
            <Button size="sm" variant="primary">
              <Wand2 className="size-3.5" /> Generate more
            </Button>
          </Link>
        </div>

        {activeTab === "documents" && (
          <>
            <PageToolbar>
              <SearchInput
                placeholder="Search documents, recipients…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="flex-1 min-w-[200px] max-w-md"
              />
              <SegmentedControl
                value={kindFilter}
                onChange={(v) => setKindFilter(v as KindFilter)}
                options={[
                  { label: "All", value: "all" },
                  { label: "Certs", value: "certificate" },
                  { label: "Reports", value: "report" },
                  { label: "Docs", value: "document" },
                  { label: "ID Cards", value: "id_card" },
                ]}
              />
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                {filteredGroups.length} document{filteredGroups.length !== 1 ? "s" : ""}
              </span>
            </PageToolbar>
            <div className="p-4">
              {filteredGroups.length === 0 ? (
                <div className="py-16 text-center">
                  <Globe className="size-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No published documents found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredGroups.map((g) => (
                    <PublishedDocCard
                      key={g.groupId}
                      groupData={g}
                      onTogglePortal={(portal) => handleTogglePortal(g.groupId, portal)}
                      onOpen={() => setDetailGroupId(g.groupId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "notifications" && (
          <div className="p-4">
            <NotificationFeed groups={groups} />
          </div>
        )}
      </Card>

      {/* Detail side panel */}
      {detailGroup && (
        <>
          <div className="fixed inset-0 bg-black/20 z-20 backdrop-blur-[1px]" onClick={() => setDetailGroupId(null)} />
          <DocDetailPanel
            groupData={detailGroup}
            onTogglePortal={(portal) => handleTogglePortal(detailGroup.groupId, portal)}
            onRestore={(doc) => setRestoreModal(doc)}
            onCompare={handleCompare}
            onNewVersion={() => setNewVersionModal({ groupId: detailGroup.groupId, current: detailGroup.current })}
            onClose={() => setDetailGroupId(null)}
          />
        </>
      )}

      {/* Modals */}
      {compareModal && (
        <CompareModal diff={compareModal} onClose={() => setCompareModal(null)} />
      )}
      {restoreModal && (
        <RestoreModal
          doc={restoreModal}
          onConfirm={(reason) => handleRestore(restoreModal, reason)}
          onClose={() => setRestoreModal(null)}
        />
      )}
      {newVersionModal && (
        <NewVersionModal
          groupId={newVersionModal.groupId}
          currentVersion={newVersionModal.current}
          onConfirm={(note) => handleNewVersion(newVersionModal.groupId, note)}
          onClose={() => setNewVersionModal(null)}
        />
      )}
    </PageStack>
  );
}
