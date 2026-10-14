import { Link } from "@tanstack/react-router";
import { Card, CardHeader, CardBody, Button, PageStack } from "@lumenx/ui-admin";
import { Upload, Tags, Settings, ArrowRight } from "lucide-react";

import type { CertHubView } from "@/lib/certificates/cert-hub-views";

const SECTIONS: { view: CertHubView; title: string; hint: string; icon: typeof Upload }[] = [
  {
    view: "templates",
    title: "Imports",
    hint: "Upload PPT or PPTX · map variables · save as template",
    icon: Upload,
  },
  {
    view: "templates",
    title: "Categories",
    hint: "Organize templates by academic, certificates, sports, identity",
    icon: Tags,
  },
  {
    view: "overview",
    title: "Settings",
    hint: "Prefixes, bulk limits, watermarks, Connect sync preferences",
    icon: Settings,
  },
];

export function TemplateMoreView() {
  return (
    <PageStack>
      <Card>
        <CardHeader
          title="More"
          hint="Imports · Categories · Settings"
        />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.title}
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
          <Link to="/templates" search={{ view: "issued" }}>
            <Button variant="outline">Student records</Button>
          </Link>
          <Link to="/templates" search={{ view: "issue" }}>
            <Button variant="primary">Issue to students</Button>
          </Link>
        </CardBody>
      </Card>
    </PageStack>
  );
}
