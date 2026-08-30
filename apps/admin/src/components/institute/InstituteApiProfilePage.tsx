import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import {
  loadInstituteProfile,
  resolveInstituteProfileView,
  shouldCommitInstituteProfileLoad,
  updateInstitute,
  updateInstituteSettings,
  useInstituteContext,
  type InstituteProfileStatus,
} from "@/lib/institutes";
import type {
  InstituteDto,
  InstituteKind,
  InstituteSettingsDto,
  InstituteStatus,
} from "@/lib/institutes/types";
import { InstituteCreateApiPanel } from "@/components/institute/InstituteCreateApiPanel";
import { Building2 } from "lucide-react";

function profileHint(status: InstituteProfileStatus, error: string | null): string {
  if (status === "loading") return "Loading institute profile…";
  if (status === "needs_institute") return "Select an institute to view profile.";
  if (status === "forbidden") return error ?? "Access denied.";
  if (status === "error") return error ?? "Failed to load institute profile.";
  return "";
}

const KIND_OPTIONS: InstituteKind[] = [
  "school",
  "junior_college",
  "degree_college",
  "engineering",
  "university",
];

const STATUS_OPTIONS: InstituteStatus[] = [
  "active",
  "inactive",
  "suspended",
  "archived",
];

export function InstituteApiProfilePage() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const [institute, setInstitute] = useState<InstituteDto | null>(null);
  const [settings, setSettings] = useState<InstituteSettingsDto | null>(null);
  const [loadStatus, setLoadStatus] = useState<InstituteProfileStatus>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resolvedForInstituteId, setResolvedForInstituteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<InstituteKind>("school");
  const [status, setStatus] = useState<InstituteStatus>("active");
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const activeInstituteIdRef = useRef(instituteCtx.activeInstituteId);
  activeInstituteIdRef.current = instituteCtx.activeInstituteId;

  useEffect(() => {
    if (instituteCtx.status === "loading") {
      setInstitute(null);
      setSettings(null);
      setLoadStatus("loading");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }
    if (instituteCtx.status === "error" || instituteCtx.status === "forbidden") {
      setInstitute(null);
      setSettings(null);
      setLoadStatus(instituteCtx.status === "forbidden" ? "forbidden" : "error");
      setLoadError(instituteCtx.errorMessage);
      setResolvedForInstituteId(null);
      return;
    }
    if (
      instituteCtx.status === "needs_selection" ||
      instituteCtx.status === "empty" ||
      !instituteCtx.activeInstituteId
    ) {
      setInstitute(null);
      setSettings(null);
      setLoadStatus("needs_institute");
      setLoadError(null);
      setResolvedForInstituteId(null);
      return;
    }

    const requestInstituteId = instituteCtx.activeInstituteId;
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void loadInstituteProfile(requestInstituteId).then((next) => {
      if (
        !shouldCommitInstituteProfileLoad({
          cancelled,
          requestInstituteId,
          activeInstituteId: activeInstituteIdRef.current,
        })
      ) {
        return;
      }
      setInstitute(next.institute);
      setSettings(next.settings);
      setLoadStatus(next.status);
      setLoadError(next.errorMessage);
      setResolvedForInstituteId(requestInstituteId);
      if (next.institute) {
        setName(next.institute.name);
        setCode(next.institute.code);
        setKind(next.institute.kind);
        setStatus(next.institute.status);
      }
      if (next.settings) {
        setTimezone(next.settings.timezone);
        setLocale(next.settings.locale);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    instituteCtx.status,
    instituteCtx.activeInstituteId,
    instituteCtx.errorMessage,
    reloadKey,
  ]);

  const view = resolveInstituteProfileView({
    apiMode: true,
    instituteStatus: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
    resolvedForInstituteId,
    storedInstitute: institute,
    storedSettings: settings,
    storedStatus: loadStatus,
    storedErrorMessage: loadError,
    instituteErrorMessage: instituteCtx.errorMessage,
  });

  const hint = profileHint(view.status, view.errorMessage);

  const saveIdentity = () => {
    if (!view.institute) return;
    setSavingIdentity(true);
    void updateInstitute(view.institute.id, {
      name: name.trim(),
      code: code.trim(),
      kind,
      status,
    })
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Institute identity saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save institute");
      })
      .finally(() => {
        setSavingIdentity(false);
      });
  };

  const saveSettings = () => {
    if (!view.institute) return;
    setSavingSettings(true);
    void updateInstituteSettings(view.institute.id, {
      timezone: timezone.trim(),
      locale: locale.trim(),
    })
      .then(() => {
        setReloadKey((k) => k + 1);
        notify("Institute settings saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save settings");
      })
      .finally(() => {
        setSavingSettings(false);
      });
  };

  return (
    <AppShell title="Institute" subtitle="Institute identity and settings">
      <div className="space-y-4">
        <InstituteCreateApiPanel />
        {hint ? (
          <Card>
            <EmptyState
              icon={<Building2 className="size-5" />}
              title="Institute profile"
              hint={hint}
            />
          </Card>
        ) : view.detailValid && view.institute ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Identity" hint="PATCH /institutes/:id" />
              <CardBody className="space-y-3">
                <Field label="Name" required>
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Code" required>
                  <TextInput value={code} onChange={(e) => setCode(e.target.value)} />
                </Field>
                <Field label="Kind">
                  <Select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as InstituteKind)}
                  >
                    {KIND_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.replace(/_/g, " ")}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Status">
                  <Select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InstituteStatus)}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Institute ID">
                  <TextInput value={view.institute.id} readOnly className="bg-muted/30" />
                </Field>
                <Button
                  variant="primary"
                  onClick={saveIdentity}
                  disabled={savingIdentity || !name.trim() || !code.trim()}
                >
                  {savingIdentity ? "Saving…" : "Save identity"}
                </Button>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Settings" hint="PATCH /institutes/:id/settings" />
              <CardBody className="space-y-3">
                <Field label="Timezone" required>
                  <TextInput
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    placeholder="Asia/Kolkata"
                  />
                </Field>
                <Field label="Locale" required>
                  <TextInput
                    value={locale}
                    onChange={(e) => setLocale(e.target.value)}
                    placeholder="en-IN"
                  />
                </Field>
                {view.settings ? (
                  <p className="text-[11px] text-muted-foreground">
                    Updated {new Date(view.settings.updatedAt).toLocaleString()}
                  </p>
                ) : null}
                <Button
                  variant="primary"
                  onClick={saveSettings}
                  disabled={savingSettings || !timezone.trim() || !locale.trim()}
                >
                  {savingSettings ? "Saving…" : "Save settings"}
                </Button>
              </CardBody>
            </Card>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
