import { useEffect, useMemo, useState } from "react";
import { useReloadKey } from "@/hooks/useReloadKey";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Field,
  FormGrid,
  Kpi,
  KpiGrid,
  PageStack,
  PageToolbar,
  Select,
  Td,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { GraduationCap } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadProgressionCatalog } from "@/lib/enrollments/progression-load";
import { graduateEnrollments } from "@/lib/enrollments/promote";
import type { EnrollmentListItem } from "@/lib/enrollments/types";
import type { AcademicYearDto } from "@/lib/academic-years/types";
import type { ClassDto } from "@/lib/classes/types";

export function GraduationApiView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [yearId, setYearId] = useState("");
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useReloadKey();

  useEffect(() => {
    if (!isApiAuthMode() || !instituteCtx.activeInstituteId) return;
    let cancelled = false;
    setLoading(true);
    void loadProgressionCatalog(instituteCtx.activeInstituteId, yearId || null).then((catalog) => {
      if (cancelled) return;
      if (catalog.status !== "ready" && catalog.status !== "empty") {
        setError(catalog.errorMessage ?? "Unable to load graduation roster");
        setLoading(false);
        return;
      }
      setYears(catalog.years);
      const active = catalog.years.find((y) => y.status === "active");
      const nextYear = yearId || active?.id || catalog.years[0]?.id || "";
      setYearId(nextYear);
      setClasses(catalog.classes);
      setEnrollments(catalog.enrollments);
      setError(null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.activeInstituteId, yearId, reloadKey]);

  /** Prefer highest sort_order class as final year candidates when available. */
  const finalClassIds = useMemo(() => {
    if (classes.length === 0) return new Set<string>();
    const maxSort = Math.max(...classes.map((c) => c.sortOrder));
    return new Set(classes.filter((c) => c.sortOrder === maxSort).map((c) => c.id));
  }, [classes]);

  const candidates = useMemo(() => {
    return enrollments.filter((row) => {
      if (finalClassIds.size > 0 && !finalClassIds.has(row.classId)) return false;
      if (classFilter !== "all" && row.classId !== classFilter) return false;
      if (sectionFilter !== "all" && row.sectionId !== sectionFilter) return false;
      return true;
    });
  }, [enrollments, finalClassIds, classFilter, sectionFilter]);

  const selectedIds = useMemo(
    () => candidates.filter((r) => selected[r.id]).map((r) => r.id),
    [candidates, selected],
  );

  const sectionOptions = useMemo(() => {
    const scoped =
      classFilter === "all"
        ? candidates
        : candidates.filter((r) => r.classId === classFilter);
    return ["all", ...new Set(scoped.map((r) => r.sectionId))];
  }, [candidates, classFilter]);

  const runGraduate = async () => {
    if (!instituteCtx.activeInstituteId || !yearId) return;
    if (selectedIds.length === 0) {
      notify("Select at least one student to graduate");
      return;
    }
    setBusy(true);
    try {
      const rows = await graduateEnrollments({
        instituteId: instituteCtx.activeInstituteId,
        academicYearId: yearId,
        enrollmentIds: selectedIds,
      });
      notify(`Graduated ${rows.length} student${rows.length === 1 ? "" : "s"}`);
      setSelected({});
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Graduation failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageStack>
        <Card>
          <CardBody className="py-10 text-center text-sm text-muted-foreground">
            Loading graduation roster…
          </CardBody>
        </Card>
      </PageStack>
    );
  }

  if (error) {
    return (
      <PageStack>
        <Card>
          <CardBody className="py-10 text-center text-sm text-destructive">{error}</CardBody>
        </Card>
      </PageStack>
    );
  }

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Final-class candidates" value={String(candidates.length)} />
        <Kpi label="Selected" value={String(selectedIds.length)} tone="up" />
        <Kpi label="Academic year" value={years.find((y) => y.id === yearId)?.name ?? "—"} />
        <Kpi label="Final classes" value={String(finalClassIds.size)} />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Graduation"
          hint="Mark final-class enrollments as graduated"
          action={
            writesEnabled ? (
              <Button size="sm" disabled={busy || selectedIds.length === 0} onClick={() => void runGraduate()}>
                <GraduationCap className="size-3.5" />
                {busy ? "Saving…" : `Graduate (${selectedIds.length})`}
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          <FormGrid cols={2}>
            <Field label="Academic year" required>
              <Select
                value={yearId}
                onChange={(e) => {
                  setYearId(e.target.value);
                  setSelected({});
                  setClassFilter("all");
                  setSectionFilter("all");
                }}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.status})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Class">
              <Select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter("all");
                }}
              >
                <option value="all">All final classes</option>
                {classes
                  .filter((c) => finalClassIds.has(c.id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label="Section">
              <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                {sectionOptions.map((id) => (
                  <option key={id} value={id}>
                    {id === "all"
                      ? "All sections"
                      : candidates.find((r) => r.sectionId === id)?.sectionLabel ?? id}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </CardBody>
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>{candidates.length} candidates</ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const row of candidates) next[row.id] = true;
              setSelected(next);
            }}
          >
            Select all
          </Button>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto border-t border-border">
          <DataTable>
            <thead>
              <Tr>
                <Th>{""}</Th>
                <Th>Student</Th>
                <Th>Roll</Th>
                <Th>Class</Th>
                <Th>Section</Th>
              </Tr>
            </thead>
            <tbody>
              {candidates.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <input
                      type="checkbox"
                      checked={Boolean(selected[row.id])}
                      onChange={(e) =>
                        setSelected((prev) => ({ ...prev, [row.id]: e.target.checked }))
                      }
                    />
                  </Td>
                  <Td className="font-medium">{row.studentName}</Td>
                  <Td className="tabular-nums">{row.rollNo}</Td>
                  <Td>{row.classLabel}</Td>
                  <Td>{row.sectionLabel}</Td>
                </Tr>
              ))}
              {candidates.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">{""}</Td>
                  <Td className="text-muted-foreground py-8">
                    No final-class active enrollments for this year.
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                </Tr>
              ) : null}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
    </PageStack>
  );
}
