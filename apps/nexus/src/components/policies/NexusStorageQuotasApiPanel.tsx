import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Pill,
  TextInput,
} from "@lumenx/ui-admin";
import { HardDrive, Loader2, RefreshCw, Save } from "lucide-react";
import { NexusStorageUsagePanel } from "@/components/storage/NexusStorageUsagePanel";
import {
  loadStorageQuotasFromApi,
  planLimitsToUpserts,
  upsertStorageQuota,
  type StorageQuotasLoadState,
} from "@/lib/policies";
import type { PlanStorageLimits } from "@/lib/storage-quota-store";

export function NexusStorageQuotasApiPanel() {
  const [loadState, setLoadState] = useState<StorageQuotasLoadState>({
    status: "loading",
  });
  const [reloadKey, setReloadKey] = useState(0);
  const [draftLimits, setDraftLimits] = useState<PlanStorageLimits>({
    core: 50,
    plus: 200,
    max: 500,
  });
  const [warningPct, setWarningPct] = useState(80);
  const [savedLimits, setSavedLimits] = useState<PlanStorageLimits>(draftLimits);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoadState({ status: "loading" });
    void loadStorageQuotasFromApi().then((next) => {
      if (cancelled) return;
      setLoadState(next);
      if (next.status === "ready") {
        setDraftLimits(next.limits);
        setSavedLimits(next.limits);
        setWarningPct(next.warningPct);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const dirty =
    draftLimits.core !== savedLimits.core ||
    draftLimits.plus !== savedLimits.plus ||
    draftLimits.max !== savedLimits.max;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    setSavedFlash(null);
    try {
      const upserts = planLimitsToUpserts(draftLimits, warningPct);
      for (const input of upserts) {
        await upsertStorageQuota(input);
      }
      setSavedLimits(draftLimits);
      setSavedFlash("Plan storage limits saved to platform policy.");
      reload();
      window.setTimeout(() => setSavedFlash(null), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to save quotas.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 text-[11px] text-muted-foreground leading-relaxed">
        <span className="font-medium text-foreground">Live platform policy · API mode.</span>{" "}
        Usage bytes come from stored assets. Plan ceilings are persisted in{" "}
        <code className="font-mono text-[10px]">storage_quota</code> via{" "}
        <code className="font-mono text-[10px]">/api/nexus/policies/storage-quotas</code>.
      </div>

      <Card>
        <CardHeader
          title="Plan storage limits"
          hint="Core / Plus / Max ceilings in GB"
          action={
            loadState.status === "ready" ? (
              dirty ? (
                <Button variant="primary" onClick={() => void handleSave()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save limits
                </Button>
              ) : (
                <Pill tone="success">Saved</Pill>
              )
            ) : (
              <Button variant="outline" onClick={reload}>
                <RefreshCw className="size-3.5" />
              </Button>
            )
          }
        />
        <div className="px-5 pb-5 space-y-4">
          {loadState.status === "loading" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="size-4 animate-spin" /> Loading quotas…
            </div>
          )}
          {loadState.status === "error" && (
            <p className="text-sm text-destructive">{loadState.message}</p>
          )}
          {loadState.status === "ready" && (
            <>
              {savedFlash && <p className="text-xs text-success">{savedFlash}</p>}
              {saveError && <p className="text-xs text-destructive">{saveError}</p>}
              <FormGrid>
                <Field label="Core (GB)">
                  <TextInput
                    type="number"
                    min={1}
                    value={String(draftLimits.core)}
                    onChange={(e) =>
                      setDraftLimits((d) => ({ ...d, core: Number(e.target.value) || 0 }))
                    }
                  />
                </Field>
                <Field label="Plus (GB)">
                  <TextInput
                    type="number"
                    min={1}
                    value={String(draftLimits.plus)}
                    onChange={(e) =>
                      setDraftLimits((d) => ({ ...d, plus: Number(e.target.value) || 0 }))
                    }
                  />
                </Field>
                <Field label="Max (GB)" className="sm:col-span-2">
                  <TextInput
                    type="number"
                    min={1}
                    value={String(draftLimits.max)}
                    onChange={(e) =>
                      setDraftLimits((d) => ({ ...d, max: Number(e.target.value) || 0 }))
                    }
                  />
                </Field>
              </FormGrid>
              <p className="text-[10px] text-muted-foreground">
                Warning threshold: {warningPct}% (from stored quota policy). Derived storage alerts
                use these limits against live usage below.
              </p>
            </>
          )}
        </div>
      </Card>

      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <HardDrive className="size-4" /> Institute usage
      </div>
      <NexusStorageUsagePanel />
    </div>
  );
}
