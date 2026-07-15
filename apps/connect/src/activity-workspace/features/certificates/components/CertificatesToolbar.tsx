import { Search, Plus } from "lucide-react";
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@lumenx/ui";
import type {
  CertificateCategory,
  CertificateListFilters,
  CertificateStatus,
  CertificateTemplate,
} from "@/lib/activity/certificates/types";
import {
  CERTIFICATE_CATEGORY_LABELS,
  CERTIFICATE_STATUS_LABELS,
} from "@/lib/activity/certificates/types";

type Props = {
  filters: CertificateListFilters;
  onFiltersChange: (patch: Partial<CertificateListFilters>) => void;
  onGenerate: () => void;
  totalCount: number;
  templates: CertificateTemplate[];
  studentOptions: { id: string; label: string }[];
  teamOptions: { id: string; name: string }[];
};

const CATEGORY_OPTIONS = Object.entries(CERTIFICATE_CATEGORY_LABELS) as [CertificateCategory, string][];
const STATUS_OPTIONS = Object.entries(CERTIFICATE_STATUS_LABELS) as [CertificateStatus, string][];

export function CertificatesToolbar({
  filters,
  onFiltersChange,
  onGenerate,
  totalCount,
  templates,
  studentOptions,
  teamOptions,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-semibold">Certificates</h2>
          <p className="text-xs text-muted-foreground">
            {totalCount} certificate{totalCount === 1 ? "" : "s"} · generated from achievements
          </p>
        </div>
        <Button onClick={onGenerate} className="rounded-xl gap-2 shrink-0">
          <Plus className="size-4" />
          Generate Certificate
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query ?? ""}
          onChange={(e) => onFiltersChange({ query: e.target.value })}
          placeholder="Search number, student, achievement, verification ID…"
          className="h-11 rounded-xl pl-9"
          aria-label="Search certificates"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <FilterSelect
          label="Template"
          value={filters.templateId ?? "all"}
          onChange={(v) => onFiltersChange({ templateId: v })}
          options={[
            ["all", "All templates"],
            ...templates.map((t) => [t.id, t.name] as [string, string]),
          ]}
        />
        <FilterSelect
          label="Category"
          value={filters.category ?? "all"}
          onChange={(v) => onFiltersChange({ category: v as CertificateListFilters["category"] })}
          options={[["all", "All categories"], ...CATEGORY_OPTIONS]}
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
        <FilterSelect
          label="Status"
          value={filters.status ?? "all"}
          onChange={(v) => onFiltersChange({ status: v as CertificateListFilters["status"] })}
          options={[["all", "All statuses"], ...STATUS_OPTIONS]}
        />
        <div>
          <label className="mb-1 block text-[10px] font-medium text-muted-foreground">Issue date</label>
          <Input
            type="date"
            value={filters.date === "all" ? "" : (filters.date ?? "")}
            onChange={(e) => onFiltersChange({ date: e.target.value || "all" })}
            className="h-10 rounded-xl text-xs"
            aria-label="Filter by issue date"
          />
        </div>
        <FilterSelect
          label="Sort by"
          value={`${filters.sortBy ?? "date"}-${filters.sortDir ?? "desc"}`}
          onChange={(v) => {
            const [sortBy, sortDir] = v.split("-") as [
              CertificateListFilters["sortBy"],
              CertificateListFilters["sortDir"],
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
