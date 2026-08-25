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
import {
  getAllTemplates,
  getDashboardStats,
  getPopularTemplates,
  getTemplateActivity,
} from "@/lib/template-management/store";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import {
  Wand2,
  Upload,
  FolderOpen,
  FileCheck,
  Library,
  Copy,
  Power,
  ArrowRight,
} from "lucide-react";

const STEPS = [
  {
    n: "1",
    title: "Browse or duplicate",
    body: "Open Library. Use a system template as-is, or Duplicate to customize.",
    to: "library" as const,
    cta: "Open Library",
  },
  {
    n: "2",
    title: "Edit in Builder",
    body: "Change layout and variables. Save as draft until you are ready.",
    to: "builder" as const,
    cta: "Open Builder",
  },
  {
    n: "3",
    title: "Activate",
    body: "Draft templates cannot be issued. Activate in Library when ready.",
    to: "library" as const,
    cta: "See drafts",
  },
  {
    n: "4",
    title: "Issue to students",
    body: "Pick an active template, choose students, generate certificates.",
    to: "generate" as const,
    cta: "Issue now",
  },
];

export function TemplateDashboardView() {
  useTemplateStore();
  const stats = getDashboardStats();
  const popular = getPopularTemplates(5);
  const activity = getTemplateActivity().slice(0, 6);
  const drafts = getAllTemplates().filter((t) => t.status === "draft").length;
  const active = getAllTemplates().filter((t) => t.status === "active").length;

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="How the Certificates module works"
          hint="One path · Library → Builder → Activate → Issue"
        />
        <CardBody>
          <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-xl border border-border bg-muted/15 p-3 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                    {step.n}
                  </span>
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.body}</p>
                <Link to="/templates" search={{ view: step.to }}>
                  <Button size="sm" variant="outline" className="mt-1">
                    {step.cta} <ArrowRight className="size-3" />
                  </Button>
                </Link>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <KpiGrid cols={4}>
        <Kpi label="Active (can issue)" value={String(active)} tone="up" />
        <Kpi
          label="Drafts (need activate)"
          value={String(drafts)}
          tone={drafts > 0 ? "down" : "neutral"}
        />
        <Kpi label="Generated certificates" value={String(stats.generatedDocuments)} />
        <Kpi label="Templates total" value={String(stats.totalTemplates)} />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid gap-2">
              <Link to="/templates" search={{ view: "generate" }}>
                <Button className="w-full justify-start" variant="primary">
                  <FileCheck className="size-3.5" /> Issue to students
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "library" }}>
                <Button className="w-full justify-start">
                  <Library className="size-3.5" /> Browse library
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "builder" }}>
                <Button className="w-full justify-start">
                  <Wand2 className="size-3.5" /> New / edit in builder
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "students" }}>
                <Button className="w-full justify-start">
                  <FileCheck className="size-3.5" /> Student records
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "generated" }}>
                <Button className="w-full justify-start">
                  <FolderOpen className="size-3.5" /> Generated certificates
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "more" }}>
                <Button className="w-full justify-start" variant="ghost">
                  <Upload className="size-3.5" /> Import · Categories · Settings
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader
            title="Status guide"
            hint="What Active / Draft / Archived mean"
          />
          <CardBody className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Pill tone="success">Active</Pill>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ready to issue. Appears in Issue flow.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Pill tone="warning">Draft</Pill>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Editing in progress. Click <span className="font-medium text-foreground">Activate</span> in
                Library when done.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <Pill tone="neutral">Archived</Pill>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hidden from Issue. Restore from Library → Archived filter.
              </p>
            </div>
            <p className="text-xs text-muted-foreground pt-1 border-t border-border">
              <Copy className="size-3 inline mr-1" />
              Duplicate creates a <span className="font-medium text-foreground">Draft</span> copy.
              <Power className="size-3 inline mx-1" />
              Activate makes it issuable.
            </p>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Popular · recent" />
          <CardBody>
            {popular.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <ul className="space-y-3 mb-4">
                {popular.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.usageCount} uses</p>
                    </div>
                    <Pill tone="info">{t.kind.replace("_", " ")}</Pill>
                  </li>
                ))}
              </ul>
            )}
            <ul className="space-y-2 border-t border-border pt-3">
              {activity.slice(0, 4).map((a) => (
                <li key={a.id} className="text-xs text-muted-foreground">
                  <span className="font-medium capitalize text-foreground">{a.action}</span>
                  {" · "}
                  {a.templateName}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </PageStack>
  );
}
