import type { ReactNode } from "react";
import { Card, CardHeader, CardBody, Button, PageStack, Select } from "@lumenx/ui-admin";

function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-border last:border-0">
      <div>
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-0.5">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

export function TemplateSettingsView() {
  return (
    <PageStack>
      <Card>
        <CardHeader title="Generation defaults" />
        <CardBody>
          <SettingRow label="Certificate number prefix" hint="e.g. LXA/CERT">
            <input
              defaultValue="LXA/CERT"
              className="h-9 w-40 px-3 rounded-md bg-background border border-border text-xs"
            />
          </SettingRow>
          <SettingRow label="Default academic year" hint="Used in variable substitution">
            <Select className="w-40" defaultValue="2025–2026" fieldSize="md">
              <option value="2025–2026">2025–2026</option>
              <option value="2024–2025">2024–2025</option>
            </Select>
          </SettingRow>
          <SettingRow label="Auto-archive generated PDFs" hint="Move to Storage after 90 days">
            <Button size="sm">Enabled</Button>
          </SettingRow>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Bulk generation limits" />
        <CardBody>
          <SettingRow label="Max batch size" hint="Per generation job">
            <Select className="w-32" defaultValue="500" fieldSize="md">
              <option value="500">500</option>
              <option value="1000">1000</option>
              <option value="unlimited">Unlimited (Max plan)</option>
            </Select>
          </SettingRow>
          <SettingRow label="Watermark on drafts" hint="Draft templates only">
            <Button size="sm">On</Button>
          </SettingRow>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Connect sync" hint="Student certificate delivery" />
        <CardBody>
          <SettingRow label="Publish to Connect automatically" hint="After generation">
            <Button size="sm" variant="primary">
              Configure
            </Button>
          </SettingRow>
        </CardBody>
      </Card>
    </PageStack>
  );
}
