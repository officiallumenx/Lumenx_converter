/**
 * Nexus institute subscription pricing — API auth mode.
 */
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
import { useEffect, useState } from "react";
import {
  listSubscriptions,
  upsertSubscription,
  type SubscriptionDto,
  type SubscriptionLifecycle,
} from "@/lib/subscriptions/api";

function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

const LIFECYCLES: SubscriptionLifecycle[] = [
  "registered",
  "approved",
  "trial_active",
  "trial_expiring",
  "trial_expired",
  "grace_period",
  "read_only",
  "active",
];

export function InstituteSubscriptionPricingApiPanel({
  instituteId,
  instituteName,
}: {
  instituteId: string;
  instituteName?: string;
}) {
  const [sub, setSub] = useState<SubscriptionDto | null>(null);
  const [rateDraft, setRateDraft] = useState("199");
  const [studentsDraft, setStudentsDraft] = useState("0");
  const [lifecycle, setLifecycle] = useState<SubscriptionLifecycle>("trial_active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void listSubscriptions(instituteId)
      .then((rows) => {
        if (cancelled) return;
        const row = rows[0] ?? null;
        setSub(row);
        if (row) {
          setRateDraft(String(row.assignedRateInr));
          setStudentsDraft(String(row.activeStudentCount));
          setLifecycle(row.lifecycleStatus);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subscription");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instituteId]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setFlash(null);
    const rate = Math.round(Number(rateDraft));
    const students = Math.max(0, Math.round(Number(studentsDraft)));
    if (!Number.isFinite(rate) || rate < 0) {
      setError("Enter a valid assigned rate.");
      setSaving(false);
      return;
    }
    try {
      const next = await upsertSubscription({
        instituteId,
        lifecycleStatus: lifecycle,
        assignedRateInr: rate,
        activeStudentCount: students,
        trialStartAt: sub?.trialStartAt ?? null,
        trialEndAt: sub?.trialEndAt ?? null,
        graceEndsAt: sub?.graceEndsAt ?? null,
      });
      setSub(next);
      setFlash("Subscription saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Subscription pricing"
        hint={instituteName ? `${instituteName} · API` : "PUT /api/nexus/subscriptions"}
        action={
          sub ? (
            <Pill tone={sub.lifecycleStatus === "active" ? "success" : "neutral"}>
              {sub.lifecycleStatus.replace(/_/g, " ")}
            </Pill>
          ) : (
            <Pill tone="warning">No row yet</Pill>
          )
        }
      />
      <div className="px-5 pb-5 space-y-4">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {flash ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{flash}</p> : null}

        <FormGrid>
          <Field label="Assigned rate (₹ / student)">
            <TextInput value={rateDraft} onChange={(e) => setRateDraft(e.target.value)} />
          </Field>
          <Field label="Active student count">
            <TextInput value={studentsDraft} onChange={(e) => setStudentsDraft(e.target.value)} />
          </Field>
          <Field label="Lifecycle">
            <Select
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value as SubscriptionLifecycle)}
            >
              {LIFECYCLES.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </Field>
        </FormGrid>

        {sub?.currentPeriod ? (
          <p className="text-xs text-muted-foreground">
            Current period {sub.currentPeriod.startsAt.slice(0, 10)} →{" "}
            {sub.currentPeriod.endsAt.slice(0, 10)} · payable{" "}
            {formatInr(sub.currentPeriod.payableAmountInr)}
          </p>
        ) : null}

        <Button disabled={saving} onClick={() => void onSave()}>
          <Save className="size-3.5" /> {saving ? "Saving…" : "Save subscription"}
        </Button>
      </div>
    </Card>
  );
}
