import { Link } from "@tanstack/react-router";
import {
  Card,
  CardHeader,
  CardBody,
  KpiGrid,
  Kpi,
  Button,
  Pill,
  PageStack,
} from "@lumenx/ui-admin";
import { IconChip } from "@/components/IconChip";
import {
  getDocDashboardStats,
  getRecentRequests,
  getRecentGenerated,
} from "@/lib/documents-records-data";
import {
  Inbox,
  Package,
  FileText,
  FolderCheck,
  Globe,
  PenLine,
  ArrowRight,
  AlertTriangle,
  Clock,
  ChevronRight,
  Wand2,
  Tags,
  FileQuestion,
  History,
} from "lucide-react";

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  draft_generated: "info",
  published: "neutral",
  generated: "info",
  downloaded: "success",
  expired: "neutral",
  revoked: "danger",
  ready: "success",
  archived: "neutral",
  draft: "neutral",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  draft_generated: "Draft",
  published: "Published",
  generated: "Generated",
  ready: "Ready",
  archived: "Archived",
  draft: "Draft",
};

const QUICK_ACTIONS = [
  { view: "requests" as const, label: "Requests", desc: "View & approve", Icon: Inbox },
  { view: "generate" as const, label: "Generate", desc: "Issue new docs", Icon: Wand2, highlight: true },
  { view: "templates" as const, label: "Templates", desc: "Browse layouts", Icon: FileText },
  { view: "packages" as const, label: "Packages", desc: "Bundle sets", Icon: Package },
  { view: "published" as const, label: "Published", desc: "Portal docs", Icon: Globe },
  { view: "signatures" as const, label: "Signatures", desc: "Signatories", Icon: PenLine },
];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function DocDashboardView() {
  const stats = getDocDashboardStats();
  const recentRequests = getRecentRequests(5);
  const recentGenerated = getRecentGenerated(5);

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi
          label="Pending requests"
          value={String(stats.pendingRequests)}
          tone={stats.pendingRequests > 0 ? "down" : "neutral"}
          delta={stats.urgentRequests > 0 ? `${stats.urgentRequests} urgent` : undefined}
        />
        <Kpi label="Generated this month" value={String(stats.generatedThisMonth)} tone="up" delta="+3 vs last month" />
        <Kpi label="Published documents" value={String(stats.totalPublished)} />
        <Kpi label="Active signatories" value={String(stats.activeSignatories)} />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        {/* Quick actions — icon tile grid */}
        <Card className="col-span-12 lg:col-span-3">
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ view, label, desc, Icon, highlight }) => (
                <Link key={view} to="/documents" search={{ view }}>
                  <div className={`group flex flex-col gap-2.5 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                    highlight
                      ? "border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30"
                      : "border-border hover:border-border-strong hover:shadow-xs bg-background"
                  }`}>
                    <IconChip icon={Icon} size="sm" variant={highlight ? "brand" : "soft"} active={highlight} />
                    <div>
                      <p className="text-xs font-semibold leading-none">{label}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{desc}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Recent requests */}
        <Card className="col-span-12 lg:col-span-5">
          <CardHeader
            title="Recent requests"
            hint="Latest document requests from students & staff"
            action={
              <Link to="/documents" search={{ view: "requests" }}>
                <Button size="sm" variant="ghost" className="gap-1">
                  All <ArrowRight className="size-3" />
                </Button>
              </Link>
            }
          />
          <CardBody noPadding>
            {recentRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 gap-2 text-center">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  <FileQuestion className="size-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No requests yet</p>
                <p className="text-xs text-muted-foreground/60">Student requests will appear here</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentRequests.map((req) => (
                  <li
                    key={req.id}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-[11px] font-bold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {req.studentName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium truncate">{req.studentName}</span>
                        <span className="text-xs text-muted-foreground">{req.studentClass}-{req.studentSection}</span>
                        {req.urgency === "urgent" && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-destructive font-semibold">
                            <AlertTriangle className="size-3" /> Urgent
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                          {req.requestType === "package"
                            ? req.packageName
                            : req.documents.map((d) => d.categoryLabel).join(", ")}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-[10px] text-muted-foreground/60 font-mono">{req.id}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Pill tone={STATUS_TONE[req.status] ?? "neutral"}>
                        {STATUS_LABEL[req.status] ?? req.status}
                      </Pill>
                      {req.requestedOn && (
                        <span className="text-[10px] text-muted-foreground/50 flex items-center gap-0.5">
                          <Clock className="size-2.5" /> {fmtTime(req.requestedOn)}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="size-3.5 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground transition-colors" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Recent generated */}
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader
            title="Recently generated"
            action={
              <Link to="/documents" search={{ view: "generated" }}>
                <Button size="sm" variant="ghost" className="gap-1">
                  All <ArrowRight className="size-3" />
                </Button>
              </Link>
            }
          />
          <CardBody noPadding>
            {recentGenerated.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 gap-2 text-center">
                <div className="size-10 rounded-full bg-muted flex items-center justify-center">
                  <History className="size-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No documents generated</p>
                <Link to="/documents" search={{ view: "generate" }}>
                  <Button size="sm" variant="primary" className="mt-1">
                    <Wand2 className="size-3.5" /> Generate first
                  </Button>
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-border/50">
                {recentGenerated.map((doc) => (
                  <li
                    key={doc.id}
                    className="group flex items-center gap-3 px-4 py-3 hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <IconChip icon={FileText} size="sm" variant="soft" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate font-mono text-xs">{doc.docNo}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.student} · {doc.class}</p>
                    </div>
                    <Pill tone={STATUS_TONE[doc.status] ?? "neutral"}>
                      {STATUS_LABEL[doc.status] ?? doc.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active templates", value: stats.activeTemplates, Icon: FileText },
          { label: "Active packages", value: stats.activePackages, Icon: Package },
          { label: "Total requests", value: stats.totalRequests, Icon: Inbox },
          { label: "Categories", value: 6, Icon: Tags },
        ].map(({ label, value, Icon }) => (
          <Card key={label}>
            <CardBody>
              <div className="flex items-center gap-3">
                <IconChip icon={Icon} size="md" variant="soft" />
                <div>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageStack>
  );
}
