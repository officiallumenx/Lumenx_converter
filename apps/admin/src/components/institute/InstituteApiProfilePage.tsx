import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { DemoInstituteProfile } from "@lumenx/types";
import { compressInstituteLogoDataUrl, normalizeInstituteProfile } from "@lumenx/utils";
import { AppShell } from "@/components/AppShell";
import { useAdminToast } from "@/components/AdminActionToast";
import { useAuth } from "@/auth/AuthContext";
import {
  readStoredActiveInstituteId,
  writeStoredActiveInstituteId,
} from "@/lib/active-institute";
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
  demoProfileToSettingsPatch,
  resolveInstituteProfileView,
  settingsToDemoProfile,
  updateInstitute,
  updateInstituteSettings,
  useInstituteContext,
  type InstituteProfileStatus,
} from "@/lib/institutes";
import type {
  InstituteKind,
  InstituteStatus,
} from "@/lib/institutes/types";
import { InstituteCreateApiPanel } from "@/components/institute/InstituteCreateApiPanel";
import { AdminInstituteProfileEditor } from "@/components/institute/InstituteRichProfileEditor";
import { Building2 } from "lucide-react";
import {
  useInstituteProfileQuery,
  adminModulePrefix,
  adminQueryKeys,
  adminQueryRoots,
} from "@/lib/admin-queries";

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
  const queryClient = useQueryClient();
  const instituteCtx = useInstituteContext();
  const { applyApiActiveInstitute } = useAuth();
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<InstituteKind>("school");
  const [status, setStatus] = useState<InstituteStatus>("active");
  const [timezone, setTimezone] = useState("");
  const [locale, setLocale] = useState("");
  const [richProfile, setRichProfile] = useState<DemoInstituteProfile | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const profileEnabled =
    instituteCtx.status === "ready" && Boolean(instituteCtx.activeInstituteId);
  const profileQuery = useInstituteProfileQuery(
    instituteCtx.activeInstituteId,
    profileEnabled,
  );

  const institute = profileQuery.data?.institute ?? null;
  const settings = profileQuery.data?.settings ?? null;
  const loadStatus: InstituteProfileStatus =
    instituteCtx.status === "loading"
      ? "loading"
      : instituteCtx.status === "forbidden"
        ? "forbidden"
        : instituteCtx.status === "error"
          ? "error"
          : instituteCtx.status === "needs_selection" ||
              instituteCtx.status === "empty" ||
              !instituteCtx.activeInstituteId
            ? "needs_institute"
            : profileQuery.isLoading && !profileQuery.data
              ? "loading"
              : (profileQuery.data?.status ?? "loading");
  const loadError =
    instituteCtx.status === "error" || instituteCtx.status === "forbidden"
      ? instituteCtx.errorMessage
      : (profileQuery.data?.errorMessage ?? null);
  const resolvedForInstituteId =
    profileQuery.data && profileEnabled ? instituteCtx.activeInstituteId : null;

  useEffect(() => {
    if (!profileQuery.data) return;
    const next = profileQuery.data;
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
    if (next.institute && next.settings) {
      setRichProfile(settingsToDemoProfile(next.institute, next.settings));
    } else {
      setRichProfile(null);
    }
  }, [profileQuery.data]);

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

  const invalidateInstitute = () => {
    const id = instituteCtx.activeInstituteId;
    if (!id) return;
    void queryClient.invalidateQueries({
      queryKey: adminModulePrefix(id, adminQueryRoots.institute),
    });
  };

  const applySavedInstitute = (updated: {
    id: string;
    name: string;
    code: string;
    kind: InstituteKind;
    status: InstituteStatus;
    createdAt?: string;
    updatedAt?: string;
  }) => {
    const dto = {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      kind: updated.kind,
      status: updated.status,
      createdAt: updated.createdAt ?? view.institute?.createdAt ?? new Date().toISOString(),
      updatedAt: updated.updatedAt ?? new Date().toISOString(),
    };
    instituteCtx.upsertInstitute(dto);
    // Ensure auth session name apply is allowed (must match stored active preference).
    if (readStoredActiveInstituteId() !== dto.id) {
      writeStoredActiveInstituteId(dto.id);
    }
    applyApiActiveInstitute(dto.id, dto.name);
    setName(dto.name);
    setCode(dto.code);
    setKind(dto.kind);
    setStatus(dto.status);
    setRichProfile((prev) => (prev ? { ...prev, name: dto.name } : prev));
    queryClient.setQueryData(
      adminQueryKeys.instituteProfile(dto.id),
      (prev: { status: string; institute: typeof dto | null; settings: unknown; errorMessage: string | null } | undefined) => {
        if (!prev) {
          return {
            status: "ready",
            institute: dto,
            settings: null,
            errorMessage: null,
          };
        }
        return {
          ...prev,
          status: "ready",
          institute: dto,
          errorMessage: null,
        };
      },
    );
    invalidateInstitute();
  };

  const saveIdentity = () => {
    if (!view.institute) return;
    const nextName = name.trim();
    const nextCode = code.trim();
    if (!nextName || !nextCode) {
      notify("Name and code are required");
      return;
    }
    setSavingIdentity(true);
    void updateInstitute(view.institute.id, {
      name: nextName,
      code: nextCode,
      kind,
      status,
    })
      .then((updated) => {
        applySavedInstitute(updated);
        notify("Institute identity saved");
        // Background refresh — do not block UI on list reload.
        void instituteCtx.reload().then((next) => {
          if (next.activeInstitute) {
            applyApiActiveInstitute(
              next.activeInstitute.id,
              next.activeInstitute.name,
            );
          }
        });
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
        invalidateInstitute();
        notify("Institute settings saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save settings");
      })
      .finally(() => {
        setSavingSettings(false);
      });
  };

  const saveRichProfile = () => {
    if (!view.institute || !view.settings || !richProfile) return;
    setSavingProfile(true);
    void (async () => {
      let profile = richProfile;
      const photo = profile.profilePhoto?.trim() ?? "";
      if (photo.startsWith("data:image/") && photo.length > 120_000) {
        const compressed = await compressInstituteLogoDataUrl(photo, {
          maxEdge: 256,
          quality: 0.82,
          maxDataUrlChars: 400_000,
        }).catch(() => null);
        if (compressed) {
          profile = { ...profile, profilePhoto: compressed };
          setRichProfile(profile);
        }
      }
      await updateInstituteSettings(view.institute!.id, {
        settings: demoProfileToSettingsPatch(view.settings!.settings, profile),
      });
      invalidateInstitute();
      notify("Institute profile saved");
    })()
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save institute profile");
      })
      .finally(() => {
        setSavingProfile(false);
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
              <CardHeader title="Identity" hint="Institute identity" />
              <CardBody className="space-y-3">
                <Field label="Name" required>
                  <TextInput value={name} onChange={(e) => setName(e.target.value)} />
                </Field>
                <Field label="Code" required>
                  <TextInput value={code} onChange={(e) => setCode(e.target.value)} />
                </Field>
                <p className="text-[11px] text-muted-foreground">
                  Saving updates the login list and header switcher name/code.
                </p>
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
              <CardHeader title="Settings" hint="Institute settings" />
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
            {richProfile ? (
              <Card className="lg:col-span-2">
                <CardHeader
                  title="Public institute profile"
                  hint="Stored in institute_settings.settings.profile · shown in Admissions and Careers"
                />
                <CardBody className="space-y-4">
                  <AdminInstituteProfileEditor
                    value={richProfile}
                    onChange={(next) => setRichProfile(normalizeInstituteProfile(next))}
                  />
                  <Button
                    variant="primary"
                    onClick={saveRichProfile}
                    disabled={savingProfile || !richProfile.name.trim()}
                  >
                    {savingProfile ? "Saving…" : "Save public profile"}
                  </Button>
                </CardBody>
              </Card>
            ) : null}
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
