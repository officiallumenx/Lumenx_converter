/**
 * Platform-operator institute create — POST /api/v1/institutes.
 */
import { useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  createInstitute,
  useInstituteContext,
  type InstituteKind,
} from "@/lib/institutes";
import { Building2 } from "lucide-react";

const KIND_OPTIONS: InstituteKind[] = [
  "school",
  "junior_college",
  "degree_college",
  "engineering",
  "university",
];

export function InstituteCreateApiPanel() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<InstituteKind>("school");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [locale, setLocale] = useState("en-IN");
  const [saving, setSaving] = useState(false);

  if (!instituteCtx.isPlatformOperator) {
    return null;
  }

  const submit = () => {
    if (!code.trim() || !name.trim()) {
      notify("Code and name are required");
      return;
    }
    setSaving(true);
    void createInstitute({
      code: code.trim(),
      name: name.trim(),
      kind,
      status: "active",
      timezone: timezone.trim() || undefined,
      locale: locale.trim() || undefined,
    })
      .then(async (created) => {
        setCode("");
        setName("");
        notify(`Institute created · ${created.name}`);
        await instituteCtx.reload();
        try {
          await instituteCtx.selectInstitute(created.id);
        } catch {
          notify("Institute created — select it from the institute switcher");
        }
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to create institute");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  return (
    <Card>
      <CardHeader
        title="Create institute"
        hint="POST /api/v1/institutes · platform operator only"
        action={<Pill tone="info">Platform</Pill>}
      />
      <div className="space-y-3 px-5 pb-5">
        <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
          <Building2 className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Creates institute + default settings. Add a membership under Accounts
            before non-operator admins can access it.
          </span>
        </div>
        <Field label="Code">
          <TextInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="LX-DEMO"
          />
        </Field>
        <Field label="Name">
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lumen School"
          />
        </Field>
        <Field label="Kind">
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as InstituteKind)}
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Timezone">
          <TextInput
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </Field>
        <Field label="Locale">
          <TextInput value={locale} onChange={(e) => setLocale(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={submit} disabled={saving}>
          {saving ? "Creating…" : "Create institute"}
        </Button>
      </div>
    </Card>
  );
}
