import { useMemo } from "react";
import { Building2, GraduationCap, Layers, UserRound, Users } from "lucide-react";
import { Badge, Button, cn } from "@lumenx/ui";
import type { ActivityAudienceSelection, AudienceScopeType } from "@/activity-workspace/hub/audience";
import { summarizeAudience } from "@/activity-workspace/hub/audience";
import {
  PARTICIPANT_CLASS_NAMES,
  PARTICIPANT_SECTIONS,
  PARTICIPANT_STUDENT_OPTIONS,
} from "../lib/participant-mock-data";

type TeamOption = { id: string; name: string };

const SCOPE_META: Record<
  AudienceScopeType,
  { label: string; icon: typeof Users; description: string }
> = {
  teams: {
    label: "Sports Teams",
    icon: Users,
    description: "Select one or more sports teams",
  },
  classes: {
    label: "Classes",
    icon: GraduationCap,
    description: "Select whole classes",
  },
  sections: {
    label: "Sections",
    icon: Layers,
    description: "Select class sections",
  },
  individual_students: {
    label: "Students",
    icon: UserRound,
    description: "Pick individual students",
  },
  entire_institute: {
    label: "Institute",
    icon: Building2,
    description: "Broadcast to entire institute",
  },
  groups: {
    label: "Groups",
    icon: Users,
    description: "Activity groups (not used in sports)",
  },
};

const SPORTS_SCOPES: AudienceScopeType[] = [
  "teams",
  "classes",
  "sections",
  "individual_students",
  "entire_institute",
];

type Props = {
  value: ActivityAudienceSelection;
  onChange: (audience: ActivityAudienceSelection) => void;
  teams: TeamOption[];
  className?: string;
  /** Limit which participant scopes are shown — defaults to full sports set. */
  allowedScopes?: AudienceScopeType[];
};

export function ParticipantSelector({
  value,
  onChange,
  teams,
  className,
  allowedScopes = SPORTS_SCOPES,
}: Props) {
  const scope = value.type;

  const summary = useMemo(() => summarizeAudience(value), [value]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {allowedScopes.map((s) => {
          const meta = SCOPE_META[s];
          const Icon = meta.icon;
          const active = scope === s;
          return (
            <Button
              key={s}
              type="button"
              variant={active ? "default" : "outline"}
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
              onClick={() => onChange(defaultAudienceForScope(s, teams))}
            >
              <Icon className="size-3.5" aria-hidden />
              {meta.label}
            </Button>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground">{SCOPE_META[scope].description}</p>

      {scope === "teams" ? (
        <TeamPicker
          teams={teams}
          selectedIds={value.type === "teams" ? value.teamIds : []}
          onChange={(teamIds, teamLabels) =>
            onChange({ type: "teams", teamIds, teamLabels })
          }
        />
      ) : null}

      {scope === "classes" ? (
        <ClassPicker
          selected={value.type === "classes" ? value.classNames : []}
          onChange={(classNames) => onChange({ type: "classes", classNames })}
        />
      ) : null}

      {scope === "sections" ? (
        <SectionPicker
          selected={value.type === "sections" ? value.sections : []}
          onChange={(sections) => onChange({ type: "sections", sections })}
        />
      ) : null}

      {scope === "individual_students" ? (
        <StudentPicker
          selectedIds={value.type === "individual_students" ? value.studentIds : []}
          onChange={(studentIds) => onChange({ type: "individual_students", studentIds })}
        />
      ) : null}

      {scope === "entire_institute" ? (
        <div className="rounded-xl border border-border bg-muted/10 px-3 py-2.5 text-sm text-muted-foreground">
          All students, parents, and staff across the institute will be eligible participants.
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Selected
        </span>
        <Badge variant="outline" className="text-[10px] font-normal">
          {summary}
        </Badge>
      </div>
    </div>
  );
}

function defaultAudienceForScope(
  scope: AudienceScopeType,
  teams: TeamOption[],
): ActivityAudienceSelection {
  switch (scope) {
    case "teams":
      return {
        type: "teams",
        teamIds: teams[0] ? [teams[0].id] : [],
        teamLabels: teams[0] ? [teams[0].name] : [],
      };
    case "classes":
      return { type: "classes", classNames: ["9"] };
    case "sections":
      return { type: "sections", sections: [{ className: "9", section: "A" }] };
    case "individual_students":
      return { type: "individual_students", studentIds: [] };
    default:
      return { type: "entire_institute" };
  }
}

function TeamPicker({
  teams,
  selectedIds,
  onChange,
}: {
  teams: TeamOption[];
  selectedIds: string[];
  onChange: (ids: string[], labels: string[]) => void;
}) {
  const toggle = (id: string, name: string) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    const labels = teams.filter((t) => next.includes(t.id)).map((t) => t.name);
    onChange(next, labels);
  };

  if (teams.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">No active sports teams available.</p>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {teams.map((team) => {
        const checked = selectedIds.includes(team.id);
        return (
          <label
            key={team.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20",
            )}
          >
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={checked}
              onChange={() => toggle(team.id, team.name)}
            />
            <span className="truncate">{team.name}</span>
          </label>
        );
      })}
    </div>
  );
}

function ClassPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (classNames: string[]) => void;
}) {
  const toggle = (className: string) => {
    onChange(
      selected.includes(className)
        ? selected.filter((c) => c !== className)
        : [...selected, className],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {PARTICIPANT_CLASS_NAMES.map((c) => {
        const checked = selected.includes(c);
        return (
          <Button
            key={c}
            type="button"
            size="sm"
            variant={checked ? "default" : "outline"}
            className="rounded-xl min-w-[3.5rem]"
            onClick={() => toggle(c)}
          >
            Class {c}
          </Button>
        );
      })}
    </div>
  );
}

function SectionPicker({
  selected,
  onChange,
}: {
  selected: { className: string; section: string }[];
  onChange: (sections: { className: string; section: string }[]) => void;
}) {
  const key = (c: string, s: string) => `${c}-${s}`;
  const isSelected = (className: string, section: string) =>
    selected.some((x) => x.className === className && x.section === section);

  const toggle = (className: string, section: string) => {
    if (isSelected(className, section)) {
      onChange(selected.filter((x) => !(x.className === className && x.section === section)));
    } else {
      onChange([...selected, { className, section }]);
    }
  };

  return (
    <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
      {PARTICIPANT_CLASS_NAMES.map((className) => (
        <div key={className}>
          <p className="mb-1.5 text-[10px] font-medium text-muted-foreground">Class {className}</p>
          <div className="flex flex-wrap gap-2">
            {PARTICIPANT_SECTIONS.map((section) => {
              const checked = isSelected(className, section);
              return (
                <Button
                  key={key(className, section)}
                  type="button"
                  size="sm"
                  variant={checked ? "default" : "outline"}
                  className="rounded-xl h-8 text-xs"
                  onClick={() => toggle(className, section)}
                >
                  {className}-{section}
                </Button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function StudentPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (studentIds: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
    );
  };

  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
      {PARTICIPANT_STUDENT_OPTIONS.map((student) => {
        const checked = selectedIds.includes(student.id);
        return (
          <label
            key={student.id}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm",
              checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted/20",
            )}
          >
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={checked}
              onChange={() => toggle(student.id)}
            />
            <span className="min-w-0 flex-1 truncate">{student.name}</span>
            <span className="text-[10px] text-muted-foreground shrink-0">
              {student.className}-{student.section} · Roll {student.rollNo}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/** Derive linked team ids from audience for sports activity filters. */
export function deriveLinkedTeamIds(
  audience: ActivityAudienceSelection,
  explicitTeamIds?: string[],
): string[] {
  if (explicitTeamIds?.length) return explicitTeamIds;
  if (audience.type === "teams") return audience.teamIds;
  return [];
}
