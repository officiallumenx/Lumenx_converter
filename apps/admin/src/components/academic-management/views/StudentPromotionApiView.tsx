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
  Pill,
  Select,
  Td,
  Th,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
  Tr,
} from "@lumenx/ui-admin";
import { ArrowUpFromLine } from "lucide-react";
import { useAdminToast } from "@/components/AdminActionToast";
import { useInstituteContext } from "@/lib/institutes";
import { resolveWritesEnabled } from "@/lib/security/writes-enabled";
import { isApiAuthMode } from "@/auth/auth-mode";
import { listClassesCatalog } from "@/lib/classes/api";
import { loadProgressionCatalog } from "@/lib/enrollments/progression-load";
import {
  promoteEnrollments,
  type EnrollmentPromoteAction,
} from "@/lib/enrollments/promote";
import type { EnrollmentListItem } from "@/lib/enrollments/types";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { AcademicYearDto } from "@/lib/academic-years/types";

const ACTION_OPTIONS: { id: EnrollmentPromoteAction; label: string }[] = [
  { id: "promote", label: "Promote" },
  { id: "repeat", label: "Repeat" },
  { id: "hold", label: "Hold" },
  { id: "transfer", label: "Transfer" },
  { id: "dropout", label: "Dropout" },
  { id: "graduate", label: "Graduate" },
];

export function StudentPromotionApiView() {
  const notify = useAdminToast();
  const instituteCtx = useInstituteContext();
  const writesEnabled = resolveWritesEnabled(true, {
    status: instituteCtx.status,
    activeInstituteId: instituteCtx.activeInstituteId,
  });

  const [years, setYears] = useState<AcademicYearDto[]>([]);
  const [sourceYearId, setSourceYearId] = useState("");
  const [targetYearId, setTargetYearId] = useState("");
  const [enrollments, setEnrollments] = useState<EnrollmentListItem[]>([]);
  const [sourceClasses, setSourceClasses] = useState<ClassDto[]>([]);
  const [sourceSections, setSourceSections] = useState<SectionDto[]>([]);
  const [targetClasses, setTargetClasses] = useState<ClassDto[]>([]);
  const [targetSections, setTargetSections] = useState<SectionDto[]>([]);
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [actions, setActions] = useState<Record<string, EnrollmentPromoteAction>>({});
  const [targetByEnrollment, setTargetByEnrollment] = useState<
    Record<string, { classId: string; sectionId: string }>
  >({});
  const [defaultTargetClassId, setDefaultTargetClassId] = useState("");
  const [defaultTargetSectionId, setDefaultTargetSectionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useReloadKey();

  useEffect(() => {
    if (!isApiAuthMode() || !instituteCtx.activeInstituteId) return;
    let cancelled = false;
    setLoading(true);
    void loadProgressionCatalog(instituteCtx.activeInstituteId, sourceYearId || null).then(
      async (catalog) => {
        if (cancelled) return;
        if (catalog.status !== "ready" && catalog.status !== "empty") {
          setError(catalog.errorMessage ?? "Unable to load promotion roster");
          setLoading(false);
          return;
        }
        setYears(catalog.years);
        const active = catalog.years.find((y) => y.status === "active");
        const upcoming = catalog.years.find((y) => y.status === "upcoming");
        const nextSource = sourceYearId || active?.id || catalog.years[0]?.id || "";
        const nextTarget =
          targetYearId ||
          upcoming?.id ||
          catalog.years.find((y) => y.id !== nextSource)?.id ||
          nextSource;
        setSourceYearId(nextSource);
        setTargetYearId(nextTarget);
        setSourceClasses(catalog.classes);
        setSourceSections(catalog.sections);
        setEnrollments(catalog.enrollments);
        setError(null);

        if (nextTarget && instituteCtx.activeInstituteId) {
          const targetCatalog = await listClassesCatalog({
            instituteId: instituteCtx.activeInstituteId,
          });
          if (cancelled) return;
          const classes = targetCatalog.classes.filter(
            (c) => c.academicYearId === nextTarget,
          );
          const sections = targetCatalog.sections.filter(
            (s) => s.academicYearId === nextTarget,
          );
          setTargetClasses(classes);
          setTargetSections(sections);
          const firstClass = classes[0];
          const firstSection = sections.find((s) => s.classId === firstClass?.id);
          setDefaultTargetClassId(firstClass?.id ?? "");
          setDefaultTargetSectionId(firstSection?.id ?? "");
        }
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [instituteCtx.activeInstituteId, sourceYearId, targetYearId, reloadKey]);

  const filtered = useMemo(() => {
    return enrollments.filter((row) => {
      if (classFilter !== "all" && row.classId !== classFilter) return false;
      if (sectionFilter !== "all" && row.sectionId !== sectionFilter) return false;
      return true;
    });
  }, [enrollments, classFilter, sectionFilter]);

  const selectedIds = useMemo(
    () => filtered.filter((r) => selected[r.id]).map((r) => r.id),
    [filtered, selected],
  );

  const sectionsForClass = (classId: string) =>
    sourceSections.filter((s) => s.classId === classId);

  const targetSectionsFor = (classId: string) =>
    targetSections.filter((s) => s.classId === classId);

  const runPromote = async () => {
    if (!instituteCtx.activeInstituteId || !sourceYearId || !targetYearId) return;
    if (selectedIds.length === 0) {
      notify("Select at least one student");
      return;
    }
    setBusy(true);
    try {
      const items = selectedIds.map((id) => {
        const action = actions[id] ?? "promote";
        const target = targetByEnrollment[id] ?? {
          classId: defaultTargetClassId,
          sectionId: defaultTargetSectionId,
        };
        return {
          enrollmentId: id,
          action,
          targetClassId:
            action === "promote" || action === "repeat" ? target.classId : undefined,
          targetSectionId:
            action === "promote" || action === "repeat" ? target.sectionId : undefined,
        };
      });
      const missing = items.filter(
        (i) =>
          (i.action === "promote" || i.action === "repeat") &&
          (!i.targetClassId || !i.targetSectionId),
      );
      if (missing.length > 0) {
        notify("Choose target class and section for promote/repeat rows");
        setBusy(false);
        return;
      }
      const results = await promoteEnrollments({
        instituteId: instituteCtx.activeInstituteId,
        sourceAcademicYearId: sourceYearId,
        targetAcademicYearId: targetYearId,
        items,
      });
      notify(`Processed ${results.length} enrollment${results.length === 1 ? "" : "s"}`);
      setSelected({});
      setReloadKey((k) => k + 1);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Promotion failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <PageStack>
        <Card>
          <CardBody className="py-10 text-center text-sm text-muted-foreground">
            Loading promotion roster…
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
        <Kpi label="Active enrollments" value={String(enrollments.length)} />
        <Kpi label="Shown" value={String(filtered.length)} />
        <Kpi label="Selected" value={String(selectedIds.length)} tone="up" />
        <Kpi label="Target year" value={years.find((y) => y.id === targetYearId)?.name ?? "—"} />
      </KpiGrid>

      <Card>
        <CardHeader title="Promotion scope" hint="Source year roster → target year placements" />
        <CardBody>
          <FormGrid cols={2}>
            <Field label="Source academic year" required>
              <Select
                value={sourceYearId}
                onChange={(e) => {
                  setSourceYearId(e.target.value);
                  setClassFilter("all");
                  setSectionFilter("all");
                  setSelected({});
                }}
              >
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.status})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target academic year" required>
              <Select value={targetYearId} onChange={(e) => setTargetYearId(e.target.value)}>
                {years.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} ({y.status})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Class filter">
              <Select
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setSectionFilter("all");
                }}
              >
                <option value="all">All classes</option>
                {sourceClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section filter">
              <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                <option value="all">All sections</option>
                {(classFilter === "all"
                  ? sourceSections
                  : sectionsForClass(classFilter)
                ).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code || s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default target class">
              <Select
                value={defaultTargetClassId}
                onChange={(e) => {
                  setDefaultTargetClassId(e.target.value);
                  const first = targetSectionsFor(e.target.value)[0];
                  setDefaultTargetSectionId(first?.id ?? "");
                }}
              >
                {targetClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Default target section">
              <Select
                value={defaultTargetSectionId}
                onChange={(e) => setDefaultTargetSectionId(e.target.value)}
              >
                {targetSectionsFor(defaultTargetClassId).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code || s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </FormGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Roster"
          hint="Select students and choose an action per row"
          action={
            writesEnabled ? (
              <Button size="sm" disabled={busy || selectedIds.length === 0} onClick={() => void runPromote()}>
                <ArrowUpFromLine className="size-3.5" />
                {busy ? "Processing…" : `Apply (${selectedIds.length})`}
              </Button>
            ) : undefined
          }
        />
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>{filtered.length} students</ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const next: Record<string, boolean> = {};
              for (const row of filtered) next[row.id] = true;
              setSelected(next);
            }}
          >
            Select all
          </Button>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>{""}</Th>
                <Th>Student</Th>
                <Th>Roll</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Action</Th>
                <Th>Target class</Th>
                <Th>Target section</Th>
              </Tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const action = actions[row.id] ?? "promote";
                const target = targetByEnrollment[row.id] ?? {
                  classId: defaultTargetClassId,
                  sectionId: defaultTargetSectionId,
                };
                const needsTarget = action === "promote" || action === "repeat";
                return (
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
                    <Td>
                      <Select
                        value={action}
                        onChange={(e) =>
                          setActions((prev) => ({
                            ...prev,
                            [row.id]: e.target.value as EnrollmentPromoteAction,
                          }))
                        }
                      >
                        {ACTION_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td>
                      {needsTarget ? (
                        <Select
                          value={target.classId}
                          onChange={(e) => {
                            const classId = e.target.value;
                            const sectionId = targetSectionsFor(classId)[0]?.id ?? "";
                            setTargetByEnrollment((prev) => ({
                              ...prev,
                              [row.id]: { classId, sectionId },
                            }));
                          }}
                        >
                          {targetClasses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Pill tone="neutral">—</Pill>
                      )}
                    </Td>
                    <Td>
                      {needsTarget ? (
                        <Select
                          value={target.sectionId}
                          onChange={(e) =>
                            setTargetByEnrollment((prev) => ({
                              ...prev,
                              [row.id]: {
                                classId: target.classId,
                                sectionId: e.target.value,
                              },
                            }))
                          }
                        >
                          {targetSectionsFor(target.classId).map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.code || s.name}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Pill tone="neutral">—</Pill>
                      )}
                    </Td>
                  </Tr>
                );
              })}
              {filtered.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">{""}</Td>
                  <Td className="text-muted-foreground py-8">
                    No active enrollments for this year / filters.
                  </Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
                  <Td>{""}</Td>
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
