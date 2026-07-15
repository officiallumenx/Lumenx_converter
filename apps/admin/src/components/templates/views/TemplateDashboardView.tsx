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
  getDashboardStats,
  getPopularTemplates,
  getTemplateActivity,
} from "@/lib/template-management/store";
import { useTemplateStore } from "@/components/templates/useTemplateStore";
import { Plus, Wand2, Upload, FolderOpen, Sparkles, FileCheck } from "lucide-react";

export function TemplateDashboardView() {
  useTemplateStore();
  const stats = getDashboardStats();
  const popular = getPopularTemplates(5);
  const activity = getTemplateActivity().slice(0, 6);

  return (
    <PageStack>
      <KpiGrid cols={6}>
        <Kpi label="Total templates" value={String(stats.totalTemplates)} />
        <Kpi label="Templates in use" value={String(stats.inUse)} tone="up" />
        <Kpi label="Generated documents" value={String(stats.generatedDocuments)} />
        <Kpi label="Certificate templates" value={String(stats.certificateTemplates)} />
        <Kpi label="Report templates" value={String(stats.reportTemplates)} />
        <Kpi label="ID templates" value={String(stats.idTemplates)} />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Quick actions" />
          <CardBody>
            <div className="grid gap-2">
              <Link to="/templates" search={{ view: "generate" }}>
                <Button className="w-full justify-start" variant="primary">
                  <FileCheck className="size-3.5" /> Issue certificates to students
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "builder" }}>
                <Button className="w-full justify-start">
                  <Wand2 className="size-3.5" /> Create new template
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "imports" }}>
                <Button className="w-full justify-start">
                  <Upload className="size-3.5" /> Import template
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "library" }}>
                <Button className="w-full justify-start">
                  <Plus className="size-3.5" /> Browse library
                </Button>
              </Link>
              <Link to="/templates" search={{ view: "generated" }}>
                <Button className="w-full justify-start">
                  <FolderOpen className="size-3.5" /> Generated documents
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Popular templates" hint="By usage count" />
          <CardBody>
            {popular.length === 0 ? (
              <p className="text-sm text-muted-foreground">No templates yet.</p>
            ) : (
              <ul className="space-y-3">
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
          </CardBody>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Recent activity" />
          <CardBody>
            <ul className="space-y-3">
              {activity.map((a) => (
                <li key={a.id} className="text-sm border-b border-border/60 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-3 text-primary shrink-0" />
                    <span className="font-medium capitalize">{a.action}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 pl-5">{a.templateName}</p>
                  {a.detail && (
                    <p className="text-[10px] text-muted-foreground pl-5">{a.detail}</p>
                  )}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </PageStack>
  );
}
