import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Field,
  FormGrid,
  Pill,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { Save } from "lucide-react";
import {
  listLicenses,
  upsertLicense,
  type LicenseCadence,
  type LicenseDto,
  type LicensePlan,
} from "@/lib/licenses/api";

const ADMIN_MODULE_OPTIONS = [
  "students",
  "teachers",
  "parents",
  "classes",
  "attendance",
  "timetable",
  "exams",
  "marks",
  "fees",
  "transport",
  "notifications",
  "alerts",
  "analytics",
  "complaints",
  "events",
  "announcements",
  "permissions",
  "storage",
] as const;

type InstituteOption = { id: string; name: string };

export function ModulesLicensesApiPanel({
  institutes,
}: {
  institutes: InstituteOption[];
}) {
  const [licenses, setLicenses] = useState<LicenseDto[]>([]);
  const [instituteId, setInstituteId] = useState(institutes[0]?.id ?? "");
  const [plan, setPlan] = useState<LicensePlan>("plus");
  const [cadence, setCadence] = useState<LicenseCadence>("yearly");
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listLicenses();
      setLicenses(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load licenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const instituteOptions = useMemo(() => {
    const byId = new Map(institutes.map((i) => [i.id, i.name]));
    for (const row of licenses) {
      if (!byId.has(row.instituteId)) {
        byId.set(row.instituteId, row.instituteId.slice(0, 8) + "…");
      }
    }
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [institutes, licenses]);

  useEffect(() => {
    if (!instituteId && instituteOptions[0]?.id) setInstituteId(instituteOptions[0].id);
  }, [instituteOptions, instituteId]);

  const selected = useMemo(
    () => licenses.find((l) => l.instituteId === instituteId) ?? null,
    [licenses, instituteId],
  );

  useEffect(() => {
    if (!selected) {
      setPlan("plus");
      setCadence("yearly");
      setEnabledModules(new Set(ADMIN_MODULE_OPTIONS));
      return;
    }
    setPlan(selected.plan);
    setCadence(selected.cadence);
    setEnabledModules(
      new Set(
        selected.entitlements
          .filter((e) => e.scope === "admin_module" && e.enabled)
          .map((e) => e.targetId),
      ),
    );
  }, [selected]);

  const onSave = async () => {
    if (!instituteId) return;
    setSaving(true);
    setError(null);
    setFlash(null);
    try {
      await upsertLicense({
        instituteId,
        plan,
        cadence,
        entitlements: ADMIN_MODULE_OPTIONS.map((id) => ({
          scope: "admin_module" as const,
          targetId: id,
          enabled: enabledModules.has(id),
        })),
      });
      setFlash("License saved");
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (id: string) => {
    setEnabledModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Plan & module entitlements"
          hint="Live from GET/PUT /api/nexus/licenses"
          action={selected ? <Pill tone="success">Licensed</Pill> : <Pill tone="warning">No license</Pill>}
        />
        <div className="px-5 pb-5 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading licenses…</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {flash ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{flash}</p> : null}

          <FormGrid>
            <Field label="Institute">
              {instituteOptions.length > 0 ? (
                <Select value={instituteId} onChange={(e) => setInstituteId(e.target.value)}>
                  {instituteOptions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </Select>
              ) : (
                <TextInput
                  placeholder="Institute UUID"
                  value={instituteId}
                  onChange={(e) => setInstituteId(e.target.value.trim())}
                />
              )}
            </Field>
            <Field label="Plan">
              <Select value={plan} onChange={(e) => setPlan(e.target.value as LicensePlan)}>
                <option value="core">Core</option>
                <option value="plus">Plus</option>
                <option value="max">Max</option>
              </Select>
            </Field>
            <Field label="Cadence">
              <Select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as LicenseCadence)}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </Field>
          </FormGrid>

          <div>
            <div className="text-xs font-semibold mb-2">Admin modules</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ADMIN_MODULE_OPTIONS.map((id) => (
                <label
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={enabledModules.has(id)}
                    onChange={() => toggle(id)}
                  />
                  <span className="capitalize">{id.replace(/-/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <Button disabled={!instituteId || saving} onClick={() => void onSave()}>
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save license"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            {licenses.length} license(s) on the platform.
          </p>
        </div>
      </Card>
    </div>
  );
}
