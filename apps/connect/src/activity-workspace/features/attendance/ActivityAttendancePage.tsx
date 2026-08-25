import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@lumenx/ui";
import { PageHeader } from "@/components/app/PageHeader";
import { HierarchyDomainSelect } from "@/activity-workspace/shared/components/HierarchyDomainSelect";
import { HierarchyUnitSingleSelect } from "@/activity-workspace/shared/components/HierarchyUnitSelect";
import { useHierarchyUnits } from "@/activity-workspace/shared/hooks/useHierarchyUnits";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import {
  formatUnitLabel,
  unitKindLabel,
  type ActivityDomain,
  type HierarchyStudent,
} from "@/lib/activity/hierarchy";
import { workspaceCommunicationRepository } from "@/lib/activity/workspace-communication";

type Mark = "present" | "absent";

/**
 * Activity attendance — hierarchy units only (Sports Team / ECA Group).
 * Never academic class attendance.
 */
export function ActivityAttendancePage() {
  const [domain, setDomain] = useState<ActivityDomain>("sports");
  const [unitId, setUnitId] = useState("");
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const { units, loading } = useHierarchyUnits(domain);

  const selected = useMemo(() => units.find((u) => u.id === unitId) ?? null, [units, unitId]);

  const setDomainSafe = (d: ActivityDomain) => {
    setDomain(d);
    setUnitId("");
    setMarks({});
  };

  const toggleMark = (studentId: string) => {
    setMarks((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "absent" ? "present" : "absent",
    }));
  };

  const save = () => {
    if (!selected) return;
    const present = selected.students.filter((s) => (marks[s.id] ?? "present") === "present").length;
    const label = formatUnitLabel(selected);
    void workspaceCommunicationRepository.pushFromActivity({
      title: "Attendance saved",
      body: `${label} · ${present}/${selected.students.length} present.`,
      audienceLabel: `Attendance · ${label}`,
    });
    toast.success("Attendance saved", {
      description: `${label} · ${present}/${selected.students.length} present`,
    });
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Attendance"
        subtitle="Choose a team or group, then tap to mark present or absent."
      />

      <section className="activity-panel space-y-5">
        <div>
          <p className="activity-stat-label mb-2">1 · Sports or ECA</p>
          <HierarchyDomainSelect value={domain} hideLabel onChange={setDomainSafe} />
        </div>
        <div>
          <p className="activity-stat-label mb-2">2 · Select team or group</p>
          <HierarchyUnitSingleSelect
            units={units}
            selectedId={unitId}
            hideLabel
            onChange={(id) => {
              setUnitId(id);
              setMarks({});
            }}
            loading={loading}
          />
        </div>

        {selected ? (
          <div>
            <p className="activity-stat-label mb-2">3 · Mark attendance</p>
            <UnitStudentMarks
              students={selected.students}
              marks={marks}
              onToggle={toggleMark}
              unitLabel={unitKindLabel(selected.kind)}
            />
          </div>
        ) : null}

        <Button
          className="activity-primary-action w-full rounded-xl sm:w-auto"
          disabled={!selected || selected.students.length === 0}
          onClick={save}
        >
          Save attendance
        </Button>
      </section>
    </ActivityPageShell>
  );
}

function UnitStudentMarks({
  students,
  marks,
  onToggle,
  unitLabel,
}: {
  students: HierarchyStudent[];
  marks: Record<string, Mark>;
  onToggle: (id: string) => void;
  unitLabel: string;
}) {
  if (students.length === 0) {
    return (
      <ActivityEmptyState
        icon={Users}
        title={`No students on this ${unitLabel.toLowerCase()}`}
        description="Add them under Sports or Extra-Curricular first."
        className="py-5"
      />
    );
  }

  return (
    <ul className="space-y-2">
      {students.map((s) => {
        const mark = marks[s.id] ?? "present";
        return (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onToggle(s.id)}
              className="activity-list-row flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-left text-sm shadow-soft"
            >
              <div className="min-w-0">
                <span className="font-medium">{s.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {s.classLabel} · Roll {s.rollNo}
                </span>
              </div>
              <span
                className={
                  mark === "present"
                    ? "shrink-0 rounded-lg bg-success/15 px-2.5 py-1.5 text-xs font-medium text-success"
                    : "shrink-0 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
                }
              >
                {mark === "present" ? "Present" : "Absent"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
