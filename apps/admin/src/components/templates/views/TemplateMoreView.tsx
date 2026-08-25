import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardBody, Button, PageStack } from "@lumenx/ui-admin";
import { Upload, Tags, Settings, ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    view: "imports" as const,
    title: "Imports",
    hint: "Upload PPT or PPTX · map variables · save as template",
    icon: Upload,
  },
  {
    view: "categories" as const,
    title: "Categories",
    hint: "Organize templates by academic, certificates, sports, identity",
    icon: Tags,
  },
  {
    view: "settings" as const,
    title: "Settings",
    hint: "Prefixes, bulk limits, watermarks, Connect sync preferences",
    icon: Settings,
  },
];

/** Secondary tools — kept out of the main workflow tabs. */
export function TemplateMoreView() {
  return (
    <PageStack>
      <Card>
        <CardHeader
          title="More tools"
          hint="Optional · main path is Library → Builder → Activate → Issue"
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.view}
                to="/templates"
                search={{ view: s.view }}
                className="rounded-xl border border-border bg-muted/15 p-4 hover:bg-muted/30 transition-colors block space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">{s.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.hint}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                  Open <ArrowRight className="size-3" />
                </span>
              </Link>
            );
          })}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Need to issue certificates?" />
        <CardBody className="flex flex-wrap gap-2">
          <Link to="/templates" search={{ view: "students" }}>
            <Button variant="outline">Student records</Button>
          </Link>
          <Link to="/templates" search={{ view: "generate" }}>
            <Button variant="primary">Issue to students</Button>
          </Link>
        </CardBody>
      </Card>
    </PageStack>
  );
}
