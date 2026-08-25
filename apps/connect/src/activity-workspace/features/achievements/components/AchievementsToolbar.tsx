import { Search, Plus } from "lucide-react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import { ConnectDatePicker } from "@/components/app/attendance/AttendanceDatePicker";
import type {
  AchievementLevel,
  AchievementListFilters,
  AchievementSourceModule,
  AchievementType,
} from "@/lib/activity/achievements/types";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_SOURCE_MODULE_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
} from "@/lib/activity/achievements/types";

type Props = {
  filters: AchievementListFilters;
  onFiltersChange: (patch: Partial<AchievementListFilters>) => void;
  onCreate: () => void;
  totalCount: number;
  studentOptions: { id: string; label: string }[];
  teamOptions: { id: string; name: string }[];
  lockedSourceModule?: AchievementSourceModule;
  title?: string;
  subtitle?: string;
};

const TYPE_OPTIONS = Object.entries(ACHIEVEMENT_TYPE_LABELS) as [AchievementType, string][];
const LEVEL_OPTIONS = Object.entries(ACHIEVEMENT_LEVEL_LABELS) as [AchievementLevel, string][];
const MODULE_OPTIONS = Object.entries(ACHIEVEMENT_SOURCE_MODULE_LABELS) as [
  AchievementSourceModule,
  string,
][];

export function AchievementsToolbar({
  filters,
  onFiltersChange,
  onCreate,
  totalCount,
  studentOptions,
  teamOptions,
  lockedSourceModule,
  title = "Achievements",
  subtitle,
}: Props) {
  const defaultSubtitle = `${totalCount} achievement${totalCount === 1 ? "" : "s"} · activity workspace recognition`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle ?? defaultSubtitle}</p>
        </div>
        <Button onClick={onCreate} className="rounded-xl gap-2 shrink-0">
          <Plus className="size-4" />
          Add Achievement
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query ?? ""}
          onChange={(e) => onFiltersChange({ query: e.target.value })}
          placeholder="Search title, student, team, source record…"
          className="h-11 rounded-xl pl-9"
          aria-label="Search achievements"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <FilterSelect
          label="Type"
          value={filters.achievementType ?? "all"}
          onChange={(v) =>
            onFiltersChange({ achievementType: v as AchievementListFilters["achievementType"] })
          }
          options={[["all", "All types"], ...TYPE_OPTIONS]}
        />
        <FilterSelect
          label="Level"
          value={filters.level ?? "all"}
          onChange={(v) => onFiltersChange({ level: v as AchievementListFilters["level"] })}
          options={[["all", "All levels"], ...LEVEL_OPTIONS]}
        />
        <FilterSelect
          label="Student"
          value={filters.studentId ?? "all"}
          onChange={(v) => onFiltersChange({ studentId: v })}
          options={[
            ["all", "All students"],
            ...studentOptions.map((s) => [s.id, s.label] as [string, string]),
          ]}
        />
        <FilterSelect
          label="Team"
          value={filters.teamId ?? "all"}
          onChange={(v) => onFiltersChange({ teamId: v })}
          options={[
            ["all", "All teams"],
            ...teamOptions.map((t) => [t.id, t.name] as [string, string]),
          ]}
        />
        {!lockedSourceModule ? (
          <FilterSelect
            label="Source module"
            value={filters.sourceModule ?? "all"}
            onChange={(v) =>
              onFiltersChange({ sourceModule: v as AchievementListFilters["sourceModule"] })
            }
            options={[["all", "All modules"], ...MODULE_OPTIONS]}
          />
        ) : null}
        <div>
          <ConnectDatePicker
            label="Date"
            value={filters.date === "all" ? "" : (filters.date ?? "")}
            onChange={(iso) => onFiltersChange({ date: iso || "all" })}
            placeholder="All dates"
          />
        </div>
        <FilterSelect
          label="Sort by"
          value={`${filters.sortBy ?? "date"}-${filters.sortDir ?? "desc"}`}
          onChange={(v) => {
            const [sortBy, sortDir] = v.split("-") as [
              AchievementListFilters["sortBy"],
              AchievementListFilters["sortDir"],
            ];
            onFiltersChange({ sortBy, sortDir });
          }}
          options={[
            ["date-desc", "Date (newest)"],
            ["date-asc", "Date (oldest)"],
            ["student-asc", "Student (A–Z)"],
            ["student-desc", "Student (Z–A)"],
            ["updatedAt-desc", "Recently updated"],
          ]}
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-xl text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(([val, text]) => (
            <SelectItem key={val} value={val}>
              {text}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
