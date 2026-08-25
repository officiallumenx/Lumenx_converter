import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Award } from "lucide-react";
import { Button, Input } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { HierarchyDomainSelect } from "@/activity-workspace/shared/components/HierarchyDomainSelect";
import { HierarchyUnitSingleSelect } from "@/activity-workspace/shared/components/HierarchyUnitSelect";
import { HierarchyUnitStudentMultiSelect } from "@/activity-workspace/shared/components/HierarchyUnitStudentSelect";
import { useHierarchyUnits } from "@/activity-workspace/shared/hooks/useHierarchyUnits";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { ActivityFilterBar } from "@/activity-workspace/shared/ui/ActivityFilterBar";
import {
  formatUnitLabel,
  unitKindLabel,
  type ActivityDomain,
} from "@/lib/activity/hierarchy";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";
import { workspaceAchievementsRepository } from "@/lib/activity/workspace-achievements";

type Scope = "unit" | "student";

/**
 * Achievements — Team/Group or individual students from that unit’s roster only.
 * No separate student lists. No analytics.
 */
export function ActivityAchievementsPage() {
  const [domain, setDomain] = useState<ActivityDomain>("sports");
  const [unitId, setUnitId] = useState("");
  const [scope, setScope] = useState<Scope>("unit");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const { units, loading } = useHierarchyUnits(domain);

  const records = useSyncExternalStore(
    workspaceAchievementsRepository.subscribe,
    workspaceAchievementsRepository.getSnapshot,
    workspaceAchievementsRepository.getSnapshot,
  );

  const selected = useMemo(
    () => units.find((u) => u.id === unitId) ?? null,
    [units, unitId],
  );

  const unitWord = selected
    ? unitKindLabel(selected.kind)
    : units[0]
      ? unitKindLabel(units[0].kind)
      : "Team";

  const canSave = Boolean(
    selected &&
      title.trim() &&
      !saving &&
      (scope === "unit" || studentIds.length > 0),
  );

  const resetForDomain = (d: ActivityDomain) => {
    setDomain(d);
    setUnitId("");
    setStudentIds([]);
    setTitle("");
    setScope("unit");
  };

  const save = async () => {
    if (!selected || !title.trim()) return;
    setSaving(true);
    try {
      const label = formatUnitLabel(selected);
      const trimmed = title.trim();

      if (scope === "unit") {
        await workspaceAchievementsRepository.recordUnit({
          title: trimmed,
          domain,
          unitId: selected.id,
          unitLabel: label,
          unitKind: selected.kind,
        });
        await workspaceCommunicationRepository.pushFromActivity({
          title: "Achievement recorded",
          body: `“${trimmed}” for ${label}.`,
          audienceLabel: `Achievements · ${label}`,
        });
        toast.success(`${unitWord} achievement recorded`);
        setTitle("");
        return;
      }

      const picked = selected.students.filter((s) => studentIds.includes(s.id));
      if (picked.length === 0) {
        toast.message("Select at least one student from this roster");
        return;
      }

      await workspaceAchievementsRepository.recordStudents({
        title: trimmed,
        domain,
        unitId: selected.id,
        unitLabel: label,
        unitKind: selected.kind,
        students: picked.map((s) => ({ id: s.id, name: s.name })),
      });
      await workspaceCommunicationRepository.pushFromActivity({
        title: "Achievement recorded",
        body: `“${trimmed}” for ${picked.length} student(s) on ${label}.`,
        audienceLabel: `Achievements · ${label}`,
      });
      toast.success(`Recorded for ${picked.length} student(s)`);
      setTitle("");
      setStudentIds([]);
    } finally {
      setSaving(false);
    }
  };

  const recent = records.slice(0, 10);

  return (
    <ActivityPageShell>
      <PageHeader
        title="Achievements"
        subtitle="Record a team/group win, or an individual student from that roster."
      />

      <section className="activity-panel space-y-5">
        <div>
          <p className="activity-stat-label mb-2">1 · Sports or ECA</p>
          <HierarchyDomainSelect value={domain} hideLabel onChange={resetForDomain} />
        </div>

        <div>
          <p className="activity-stat-label mb-2">
            2 · Select {unitWord.toLowerCase()}
          </p>
          <HierarchyUnitSingleSelect
            units={units}
            selectedId={unitId}
            hideLabel
            onChange={(id) => {
              setUnitId(id);
              setStudentIds([]);
            }}
            loading={loading}
          />
        </div>

        {selected ? (
          <>
            <div>
              <p className="activity-stat-label mb-2">3 · Achievement for</p>
              <ActivityFilterBar>
                <button
                  type="button"
                  onClick={() => {
                    setScope("unit");
                    setStudentIds([]);
                  }}
                  className={
                    scope === "unit"
                      ? "activity-filter-chip is-active"
                      : "activity-filter-chip"
                  }
                >
                  {unitWord} achievement
                </button>
                <button
                  type="button"
                  onClick={() => setScope("student")}
                  className={
                    scope === "student"
                      ? "activity-filter-chip is-active"
                      : "activity-filter-chip"
                  }
                >
                  Individual student
                </button>
              </ActivityFilterBar>
              {scope === "unit" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Applies to the whole {unitWord.toLowerCase()}: {formatUnitLabel(selected)}.
                </p>
              ) : (
                <div className="mt-3">
                  <HierarchyUnitStudentMultiSelect
                    students={selected.students}
                    selectedIds={studentIds}
                    onChange={setStudentIds}
                    emptyLabel={`No students on this ${unitWord.toLowerCase()}. Add them in Sports or ECA first.`}
                  />
                </div>
              )}
            </div>

            <div>
              <p className="activity-stat-label mb-2">4 · What was achieved</p>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Inter-house winners"
                className="min-h-11 rounded-xl"
              />
            </div>

            <Button
              className="activity-primary-action w-full rounded-xl sm:w-auto"
              disabled={!canSave}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Record achievement"}
            </Button>
          </>
        ) : null}
      </section>

      <section>
        <h2 className="activity-stat-label mb-3">Recently recorded</h2>
        {recent.length === 0 ? (
          <ActivityEmptyState
            icon={Award}
            title="No achievements yet"
            description="Pick a team or group above to record the first one."
            className="py-6"
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="activity-list-row rounded-2xl border border-border bg-card p-4 text-sm shadow-soft"
              >
                <p className="font-medium">{r.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.scope === "unit"
                    ? `${unitKindLabel(r.unitKind)} · ${r.unitLabel}`
                    : `${r.studentName} · ${r.unitLabel}`}
                </p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {new Date(r.recordedAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </ActivityPageShell>
  );
}
