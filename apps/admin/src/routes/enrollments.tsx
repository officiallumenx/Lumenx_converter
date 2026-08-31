import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { EnrollmentsApiPage } from "@/components/enrollments/EnrollmentsApiPage";
import {
  Card,
  CardHeader,
  CascadingFiltersMenu,
  DataTable,
  EmptyState,
  PageToolbar,
  Pill,
  SearchInput,
  Td,
  Th,
  ToolbarMeta,
  Tr,
} from "@lumenx/ui-admin";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  ACADEMIC_YEAR_VIEW_OPTIONS,
  ACADEMIC_YEAR_RECORD_STATUS_OPTIONS,
} from "@/lib/academic-management-data";
import {
  enrollmentStatusLabel,
  loadDemoEnrollmentsList,
  type EnrollmentListItem,
  type EnrollmentStatus,
} from "@/lib/enrollments";
import { adminPageTitle } from "@/lib/admin-module-labels";

export const Route = createFileRoute("/enrollments")({
  validateSearch: (search: Record<string, unknown>) => ({
    sectionId:
      typeof search.sectionId === "string" && search.sectionId.trim()
        ? search.sectionId.trim()
        : undefined,
    academicYearId:
      typeof search.academicYearId === "string" && search.academicYearId.trim()
        ? search.academicYearId.trim()
        : undefined,
  }),
  head: () => ({ meta: [{ title: adminPageTitle("/enrollments") }] }),
  component: EnrollmentsPage,
});

function EnrollmentsPage() {
  const search = Route.useSearch();
  if (isApiAuthMode()) {
    return (
      <AppShell
        title="Enrollments"
        subtitle="API mode · section rosters · enroll / transfer / status"
      >
        <EnrollmentsApiPage
          initialSectionId={search.sectionId}
          initialAcademicYearId={search.academicYearId}
        />
      </AppShell>
    );
  }
  return <EnrollmentsDemoPage />;
}

function EnrollmentsDemoPage() {
  const [academicYearId, setAcademicYearId] = useState("ay-2026-27");
  const [statusFilter, setStatusFilter] = useState<"all" | EnrollmentStatus>("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [search, setSearch] = useState("");

  const demoState = useMemo(
    () =>
      loadDemoEnrollmentsList({
        academicYearId,
        status: statusFilter,
        sectionLabel: sectionFilter,
      }),
    [academicYearId, statusFilter, sectionFilter],
  );

  const sectionOptions = useMemo(() => {
    const labels = new Set(
      demoState.items.map((row) => row.sectionLabel).filter(Boolean),
    );
    return [...labels].sort();
  }, [demoState.items]);

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return demoState.items;
    return demoState.items.filter(
      (row: EnrollmentListItem) =>
        row.studentName.toLowerCase().includes(needle) ||
        row.rollNo.toLowerCase().includes(needle) ||
        row.classLabel.toLowerCase().includes(needle),
    );
  }, [demoState.items, search]);

  return (
    <AppShell
      title="Enrollments"
      subtitle="Demo mode · academic year section rosters"
    >
      <div className="space-y-4">
        <PageToolbar>
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, roll, class…"
            className="w-full max-w-xs"
          />
          <ToolbarMeta>{rows.length} rows</ToolbarMeta>
        </PageToolbar>

        <Card>
          <CardHeader title="Section rosters" hint={`${rows.length} enrollments`} />
          <div className="flex flex-wrap items-end gap-2 border-b border-border px-4 pb-3 sm:px-5">
            <CascadingFiltersMenu
              groups={[
                {
                  id: "year",
                  label: "Academic year",
                  value: academicYearId,
                  onChange: setAcademicYearId,
                  options: ACADEMIC_YEAR_VIEW_OPTIONS.map((year) => ({
                    value: year.id,
                    label: year.label,
                  })),
                },
                {
                  id: "section",
                  label: "Section",
                  value: sectionFilter,
                  onChange: setSectionFilter,
                  options: [
                    { value: "all", label: "All sections" },
                    ...sectionOptions.map((label) => ({ value: label, label })),
                  ],
                },
                {
                  id: "status",
                  label: "Status",
                  value: statusFilter,
                  onChange: (value) => setStatusFilter(value as "all" | EnrollmentStatus),
                  options: ACADEMIC_YEAR_RECORD_STATUS_OPTIONS.map((option) => ({
                    value: option === "all" ? "all" : option === "Active" ? "active" : option === "Transferred" ? "transferred" : "dropped_out",
                    label: option === "all" ? "All statuses" : option,
                  })),
                },
              ]}
            />
          </div>

          {rows.length === 0 ? (
            <div className="px-5 pb-8">
              <EmptyState
                icon={<Users className="size-5" />}
                title="No enrollments found"
                hint="Adjust filters or switch academic year."
              />
            </div>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Roll</Th>
                  <Th>Student</Th>
                  <Th>Class</Th>
                  <Th>Section</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <Tr key={row.id}>
                    <Td className="font-mono text-sm">{row.rollNo}</Td>
                    <Td className="font-medium">{row.studentName}</Td>
                    <Td>{row.classLabel}</Td>
                    <Td>{row.sectionLabel}</Td>
                    <Td>
                      <Pill tone={row.status === "active" ? "success" : "warning"}>
                        {enrollmentStatusLabel(row.status)}
                      </Pill>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
