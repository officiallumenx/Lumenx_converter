import { useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { ActivityBrowseCard } from "@/activity-workspace/shared/ui/ActivityBrowseCard";
import { ActivityEmptyState } from "@/activity-workspace/shared/ui/ActivityEmptyState";
import { ActivityInlineAdd } from "@/activity-workspace/shared/ui/ActivityInlineAdd";
import { ActivitySearchField } from "@/activity-workspace/shared/ui/ActivitySearchField";
import { ActivitySectionHeader } from "@/activity-workspace/shared/ui/ActivitySectionHeader";
import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { HierarchyBackBar } from "@/activity-workspace/shared/components/HierarchyBackBar";
import { StudentRosterEditor } from "@/activity-workspace/shared/components/StudentRosterEditor";
import { useActivityCachedLoad } from "@/activity-workspace/shared/hooks/useActivityCachedLoad";
import {
  activityHierarchyRepository,
  type HierarchyEcaActivity,
  type HierarchyGroup,
  type HierarchyStudent,
} from "@/lib/activity/hierarchy";

export function ActivityExtraCurricularPage() {
  const search = useSearch({ from: "/activity/extra-curricular" });
  const nav = useNavigate();

  const activityId = search.activity;
  const groupId = search.group;

  const go = (next: { activity?: string; group?: string }) => {
    nav({ to: "/activity/extra-curricular", search: next });
  };

  return (
    <ActivityPageShell>
      <PageHeader
        title="Extra-Curricular"
        subtitle="Pick an activity, open a group, manage students."
      />

      {!activityId ? (
        <EcaActivitiesView onOpen={(id) => go({ activity: id })} />
      ) : !groupId ? (
        <EcaGroupsView
          activityId={activityId}
          onBack={() => go({})}
          onOpenGroup={(id) => go({ activity: activityId, group: id })}
        />
      ) : (
        <EcaGroupStudentsView
          activityId={activityId}
          groupId={groupId}
          onBack={() => go({ activity: activityId })}
        />
      )}
    </ActivityPageShell>
  );
}

function EcaActivitiesView({ onOpen }: { onOpen: (id: string) => void }) {
  const { data: activities, loading, refresh } = useActivityCachedLoad({
    key: "eca:activities",
    load: () => activityHierarchyRepository.listEcaActivities(),
    initial: [] as HierarchyEcaActivity[],
  });
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter((a) => a.name.toLowerCase().includes(q));
  }, [activities, query]);

  const create = async () => {
    if (!name.trim()) return;
    const created = await activityHierarchyRepository.createEcaActivity({
      name: name.trim(),
    });
    toast.success("Activity added", { description: created.name });
    setName("");
    setShowAdd(false);
    refresh();
    onOpen(created.id);
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;

  return (
    <div className="space-y-4">
      <ActivitySectionHeader
        title="Activities"
        subtitle="Dance, Music, Drama, Yoga, Art — and more."
      />

      <ActivitySearchField
        value={query}
        onChange={setQuery}
        placeholder="Search activities…"
      />

      {filtered.length === 0 ? (
        <ActivityEmptyState
          icon={Sparkles}
          title={activities.length === 0 ? "No activities yet" : "No matches"}
          description={
            activities.length === 0
              ? "Add an activity, then create groups and add students."
              : "Try a different search."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a) => (
            <ActivityBrowseCard key={a.id} title={a.name} onClick={() => onOpen(a.id)} />
          ))}
        </div>
      )}

      {showAdd || activities.length === 0 ? (
        <ActivityInlineAdd
          label="Add activity"
          placeholder="e.g. Dance"
          value={name}
          onChange={setName}
          onSubmit={() => void create()}
          submitLabel="Add activity"
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="activity-section-link text-sm"
        >
          + Add activity
        </button>
      )}
    </div>
  );
}

function EcaGroupsView({
  activityId,
  onBack,
  onOpenGroup,
}: {
  activityId: string;
  onBack: () => void;
  onOpenGroup: (id: string) => void;
}) {
  const { data, loading, refresh } = useActivityCachedLoad({
    key: `eca:groups:${activityId}`,
    load: async () => {
      const [activity, groups] = await Promise.all([
        activityHierarchyRepository.getEcaActivity(activityId),
        activityHierarchyRepository.listGroupsByActivity(activityId),
      ]);
      return { activity, groups };
    },
    initial: {
      activity: null as HierarchyEcaActivity | null,
      groups: [] as HierarchyGroup[],
    },
  });
  const { activity, groups } = data;
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, query]);

  const create = async () => {
    if (!name.trim()) return;
    const created = await activityHierarchyRepository.createGroup({
      activityId,
      name: name.trim(),
    });
    toast.success("Group created", { description: created.name });
    setName("");
    refresh();
    onOpenGroup(created.id);
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;
  if (!activity) {
    return (
      <ActivityEmptyState
        title="Activity not found"
        action={
          <button type="button" className="activity-section-link" onClick={onBack}>
            Back to activities
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <HierarchyBackBar label="All activities" onBack={onBack} />
      <ActivitySectionHeader
        title={activity.name}
        subtitle="Groups are where you mark attendance and send messages."
      />

      {groups.length > 3 ? (
        <ActivitySearchField value={query} onChange={setQuery} placeholder="Search groups…" />
      ) : null}

      {filtered.length === 0 ? (
        <ActivityEmptyState
          title={groups.length === 0 ? "No groups yet" : "No matches"}
          description={
            groups.length === 0
              ? "Add Group 1 below, then add students to the roster."
              : "Try a different search."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {filtered.map((g) => (
            <ActivityBrowseCard
              key={g.id}
              title={g.name}
              meta={`${g.students.length} student${g.students.length === 1 ? "" : "s"}`}
              onClick={() => onOpenGroup(g.id)}
            />
          ))}
        </div>
      )}

      <ActivityInlineAdd
        label="Add group"
        placeholder="e.g. Group 1"
        value={name}
        onChange={setName}
        onSubmit={() => void create()}
      />
    </div>
  );
}

function EcaGroupStudentsView({
  activityId,
  groupId,
  onBack,
}: {
  activityId: string;
  groupId: string;
  onBack: () => void;
}) {
  const { data, loading, setData } = useActivityCachedLoad({
    key: `eca:group:${groupId}:${activityId}`,
    load: async () => {
      const [group, activity] = await Promise.all([
        activityHierarchyRepository.getGroup(groupId),
        activityHierarchyRepository.getEcaActivity(activityId),
      ]);
      return { group, activity };
    },
    initial: {
      group: null as HierarchyGroup | null,
      activity: null as HierarchyEcaActivity | null,
    },
  });
  const { group, activity } = data;

  const saveStudents = async (students: HierarchyStudent[]) => {
    const updated = await activityHierarchyRepository.setGroupStudents(groupId, students);
    if (updated) {
      setData((prev) => ({ ...prev, group: updated }));
      toast.success("Roster updated");
    }
  };

  if (loading) return <PageSkeleton variant="list" rows={3} />;
  if (!group) {
    return (
      <ActivityEmptyState
        title="Group not found"
        action={
          <button type="button" className="activity-section-link" onClick={onBack}>
            Back to groups
          </button>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <HierarchyBackBar label={`${activity?.name ?? "Activity"} groups`} onBack={onBack} />
      <div>
        <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          ECA · {activity?.name}
        </p>
        <ActivitySectionHeader
          title={group.name}
          subtitle="Add students who belong in this group."
        />
      </div>
      <StudentRosterEditor
        students={group.students}
        onChange={(s) => void saveStudents(s)}
        unitLabel="group"
      />
    </div>
  );
}
