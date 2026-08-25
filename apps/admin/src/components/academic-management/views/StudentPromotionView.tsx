import { useEffect, useMemo, useState } from "react";
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
import {
  matchingPromotionReasons,
  PROMOTION_CLASS_OPTIONS,
  PROMOTION_FILTER_DEFS,
  PROMOTION_NON_FINAL_CLASSES,
  PROMOTION_SCOPE_OPTIONS,
  PROMOTION_SECTION_OPTIONS,
  PROMOTION_YEAR_OPTIONS,
  promotionScopeSummaryLabel,
  type PromotionFilterKey,
  type PromotionReviewAction,
  type PromotionRosterStudent,
  type PromotionScopeMode,
} from "@/lib/academic-management-data";
import {
  matchPromotionRosterFromDirectory,
  persistPromoteStudents,
  type PromotionPersistOptions,
  persistPromotionReviewAction,
} from "@/lib/academic-progression";

const ACTION_LABELS: Record<PromotionReviewAction, string> = {
  promote_anyway: "Promote Anyway",
  repeat: "Repeat Class",
  hold: "Hold",
  transfer: "Transfer",
  dropout: "Dropout",
  graduate: "Graduate",
};

export function StudentPromotionView() {
  const notify = useAdminToast();

  const [sourceYearId, setSourceYearId] = useState<string>("ay-2026-27");
  const [targetYearId, setTargetYearId] = useState<string>("ay-2027-28");
  const [scope, setScope] = useState<PromotionScopeMode>("single");
  const [currentClass, setCurrentClass] = useState<string>(PROMOTION_CLASS_OPTIONS[0]!);
  const [section, setSection] = useState<string>(PROMOTION_SECTION_OPTIONS[0]!);
  const [targetClass, setTargetClass] = useState<string>(PROMOTION_CLASS_OPTIONS[1] ?? PROMOTION_CLASS_OPTIONS[0]!);
  const [targetSection, setTargetSection] = useState<string>(PROMOTION_SECTION_OPTIONS[0]!);
  const [multiClasses, setMultiClasses] = useState<string[]>([
    ...PROMOTION_NON_FINAL_CLASSES.slice(0, 2),
  ]);

  const [roster, setRoster] = useState<PromotionRosterStudent[]>(() =>
    matchPromotionRosterFromDirectory({
      yearId: "ay-2026-27",
      scope: "single",
      currentClass: PROMOTION_CLASS_OPTIONS[0]!,
      section: PROMOTION_SECTION_OPTIONS[0]!,
      multiClasses: [...PROMOTION_NON_FINAL_CLASSES.slice(0, 2)],
    }),
  );

  const [activeFilters, setActiveFilters] = useState<Record<PromotionFilterKey, boolean>>({
    failed: false,
    pendingFees: false,
    pendingLibrary: false,
    attendanceShortage: false,
    pendingDocuments: false,
    manualHold: false,
  });

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [reviewActions, setReviewActions] = useState<Record<string, PromotionReviewAction>>({});

  useEffect(() => {
    setRoster(
      matchPromotionRosterFromDirectory({
        yearId: sourceYearId,
        scope,
        currentClass,
        section,
        multiClasses,
      }),
    );
    setSelected({});
    setReviewActions({});
  }, [sourceYearId, scope, currentClass, section, multiClasses]);

  const sourceYearLabel =
    PROMOTION_YEAR_OPTIONS.find((y) => y.id === sourceYearId)?.label ?? sourceYearId;
  const targetYearLabel =
    PROMOTION_YEAR_OPTIONS.find((y) => y.id === targetYearId)?.label ?? targetYearId;

  const enabledFilters = useMemo(
    () => PROMOTION_FILTER_DEFS.filter((f) => f.enabled),
    [],
  );

  const selectedFilterKeys = useMemo(
    () =>
      enabledFilters
        .map((f) => f.key)
        .filter((key) => activeFilters[key]),
    [enabledFilters, activeFilters],
  );

  const { eligible, review } = useMemo(() => {
    const eligibleList: PromotionRosterStudent[] = [];
    const reviewList: { student: PromotionRosterStudent; reasons: string[] }[] = [];
    for (const student of roster) {
      const reasons = matchingPromotionReasons(student, selectedFilterKeys);
      if (reasons.length > 0) {
        reviewList.push({ student, reasons });
      } else {
        eligibleList.push(student);
      }
    }
    return { eligible: eligibleList, review: reviewList };
  }, [roster, selectedFilterKeys]);

  const selectedEligibleIds = useMemo(
    () => eligible.filter((s) => selected[s.id]).map((s) => s.id),
    [eligible, selected],
  );
  const selectedEligibleStudents = useMemo(
    () => eligible.filter((s) => selectedEligibleIds.includes(s.id)),
    [eligible, selectedEligibleIds],
  );
  const reviewStudents = useMemo(
    () => (selectedEligibleStudents.length > 0 ? selectedEligibleStudents : eligible),
    [eligible, selectedEligibleStudents],
  );

  const rosterScopeLabel = promotionScopeSummaryLabel({
    scope,
    currentClass,
    section,
    multiClasses,
  });

  const yearOrder = useMemo(
    () => new Map(PROMOTION_YEAR_OPTIONS.map((year, index) => [year.id, index])),
    [],
  );

  const basePromotionValidationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!targetClass.trim()) {
      errors.push("Select a target class.");
    }
    if (!targetSection.trim()) {
      errors.push("Select a target section.");
    }
    if (!sourceYearId.trim() || !targetYearId.trim()) {
      errors.push("Select both source and target academic years.");
    }
    if (sourceYearId === targetYearId) {
      errors.push("Source and target academic years must be different.");
    }
    const sourceOrder = yearOrder.get(sourceYearId);
    const targetOrder = yearOrder.get(targetYearId);
    if (
      sourceOrder !== undefined &&
      targetOrder !== undefined &&
      targetOrder <= sourceOrder
    ) {
      errors.push("Target academic year must be after the source academic year.");
    }
    if (scope === "multi" && multiClasses.length === 0) {
      errors.push("Select at least one source class for multi-class promotion.");
    }
    return errors;
  }, [
    multiClasses,
    scope,
    sourceYearId,
    targetClass,
    targetSection,
    targetYearId,
    yearOrder,
  ]);

  const validationErrorsFor = (students: PromotionRosterStudent[]) => {
    const errors = [...basePromotionValidationErrors];
    const ids = students.map((student) => student.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push("Remove duplicate student selections before confirming promotion.");
    }
    if (students.some((student) => student.academicYearId === targetYearId)) {
      errors.push("One or more selected students are already in the target academic year.");
    }
    return errors;
  };

  const promotionValidationErrors = useMemo(
    () => validationErrorsFor(reviewStudents),
    [basePromotionValidationErrors, reviewStudents, targetYearId],
  );

  const reviewRows = useMemo(
    () =>
      reviewStudents.map((student) => ({
        id: student.id,
        name: student.name,
        currentClass: student.currentClass,
        currentSection: student.section,
        targetClass,
        targetSection,
        sourceYear: sourceYearLabel,
        targetYear: targetYearLabel,
      })),
    [reviewStudents, sourceYearLabel, targetClass, targetSection, targetYearLabel],
  );

  const toggleFilter = (key: PromotionFilterKey) => {
    setActiveFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleMultiClass = (cls: string) => {
    setMultiClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls].sort(),
    );
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSelectAllEligible = () => {
    const allOn = eligible.length > 0 && eligible.every((s) => selected[s.id]);
    if (allOn) {
      setSelected((prev) => {
        const next = { ...prev };
        for (const s of eligible) delete next[s.id];
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = { ...prev };
      for (const s of eligible) next[s.id] = true;
      return next;
    });
  };

  const removeFromRoster = (ids: string[]) => {
    const idSet = new Set(ids);
    setRoster((prev) => prev.filter((s) => !idSet.has(s.id)));
    setSelected((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
    setReviewActions((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[id];
      return next;
    });
  };

  const runPromote = (students: PromotionRosterStudent[], label: string) => {
    if (students.length === 0) return;
    const ids = students.map((s) => s.id);
    const options: PromotionPersistOptions = {
      sourceYearId,
      sourceYearLabel,
      targetYearId,
      targetYearLabel,
      targetClass,
      targetSection,
    };
    persistPromoteStudents(ids, targetYearLabel, options);
    removeFromRoster(ids);
    notify(
      `${label}: ${students.length} student(s) promoted to ${targetClass}-${targetSection} · ${targetYearLabel}`,
    );
  };

  const promoteSelected = () => {
    if (selectedEligibleIds.length === 0) {
      notify("Select at least one eligible student");
      return;
    }
    const students = eligible.filter((s) => selectedEligibleIds.includes(s.id));
    const errors = validationErrorsFor(students);
    if (errors.length > 0) {
      notify(errors[0]!);
      return;
    }
    runPromote(students, "Promoted selected");
  };

  const promoteAllEligible = () => {
    if (eligible.length === 0) {
      notify("No eligible students to promote");
      return;
    }
    const errors = validationErrorsFor(eligible);
    if (errors.length > 0) {
      notify(errors[0]!);
      return;
    }
    runPromote(eligible, "Promoted all eligible");
  };

  const applyReviewAction = (student: PromotionRosterStudent) => {
    const action = reviewActions[student.id] ?? "promote_anyway";
    if (action === "graduate" && !student.isFinalClass) {
      notify("Graduate is only available for final class");
      return;
    }
    if (action === "promote_anyway") {
      runPromote([student], ACTION_LABELS[action]);
      return;
    }
    persistPromotionReviewAction(student.id, action, sourceYearLabel);
    removeFromRoster([student.id]);
    notify(`${ACTION_LABELS[action]} — ${student.name}`);
  };

  return (
    <PageStack>
      <KpiGrid cols={4}>
        <Kpi label="Loaded" value={String(roster.length)} />
        <Kpi label="Eligible" value={String(eligible.length)} tone="up" />
        <Kpi
          label="Review required"
          value={String(review.length)}
          tone={review.length > 0 ? "down" : "neutral"}
        />
        <Kpi
          label="Filters on"
          value={String(selectedFilterKeys.length)}
          delta={`${enabledFilters.length} available`}
        />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Step 1 · Class roster"
          hint="Pick source roster and target promotion destination"
        />
        <CardBody>
          <FormGrid cols={2}>
            <Field label="Source academic year" required>
              <Select value={sourceYearId} onChange={(e) => setSourceYearId(e.target.value)}>
                {PROMOTION_YEAR_OPTIONS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target academic year" required>
              <Select value={targetYearId} onChange={(e) => setTargetYearId(e.target.value)}>
                {PROMOTION_YEAR_OPTIONS.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Scope" required>
              <Select
                value={scope}
                onChange={(e) => setScope(e.target.value as PromotionScopeMode)}
              >
                {PROMOTION_SCOPE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>

            {scope === "single" ? (
              <>
                <Field label="Current class" required>
                  <Select
                    value={currentClass}
                    onChange={(e) => setCurrentClass(e.target.value)}
                  >
                    {PROMOTION_CLASS_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Section" required>
                  <Select value={section} onChange={(e) => setSection(e.target.value)}>
                    {PROMOTION_SECTION_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            <Field label="Target class" required>
              <Select value={targetClass} onChange={(e) => setTargetClass(e.target.value)}>
                {PROMOTION_CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target section" required>
              <Select value={targetSection} onChange={(e) => setTargetSection(e.target.value)}>
                {PROMOTION_SECTION_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            {scope === "multi" ? (
              <Field label="Classes" required className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {PROMOTION_NON_FINAL_CLASSES.map((cls) => {
                    const on = multiClasses.includes(cls);
                    return (
                      <label
                        key={cls}
                        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                          on
                            ? "border-primary/40 bg-primary/10 text-foreground"
                            : "border-border bg-muted/15 text-muted-foreground hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="size-4 accent-primary"
                          checked={on}
                          onChange={() => toggleMultiClass(cls)}
                        />
                        {cls}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Final class (10th) is excluded from multi-class promote — use Graduation.
                </p>
              </Field>
            ) : null}

            {scope === "institute_except_final" ? (
              <div className="sm:col-span-2 rounded-xl border border-border bg-muted/15 px-3 py-3 text-sm text-muted-foreground">
                Loads all students in{" "}
                <span className="font-medium text-foreground">
                  {PROMOTION_NON_FINAL_CLASSES.join(", ")}
                </span>{" "}
                across every section. 10th is excluded — graduate those in Graduation.
              </div>
            ) : null}
          </FormGrid>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {roster.length} student{roster.length === 1 ? "" : "s"}
            </span>{" "}
            · {rosterScopeLabel} from {sourceYearLabel} → {targetClass}-{targetSection} ({targetYearLabel}).
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Step 2 · Promotion filters"
          hint="Checked filters move matching students into Review Required (failed, fees, attendance, hold, …)"
        />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {enabledFilters.map((filter) => (
              <label
                key={filter.key}
                className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/15 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-primary shrink-0"
                  checked={activeFilters[filter.key]}
                  onChange={() => toggleFilter(filter.key)}
                />
                <span className="text-sm text-foreground leading-snug">{filter.label}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Unchecked = those groups stay in Eligible. Checked = show them under Review Required.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Step 3 · Eligible students"
          hint="No matching selected filters — promote updates student class/section and timeline"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={promoteSelected}
                disabled={selectedEligibleIds.length === 0}
              >
                <ArrowUpFromLine className="size-3.5" /> Promote Selected
              </Button>
              <Button
                size="sm"
                onClick={promoteAllEligible}
                disabled={eligible.length === 0}
              >
                Confirm Promotion
              </Button>
            </div>
          }
        />
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>
              {eligible.length} eligible · {selectedEligibleIds.length} selected
            </ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{rosterScopeLabel}</ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={
                      eligible.length > 0 && eligible.every((s) => selected[s.id])
                    }
                    onChange={toggleSelectAllEligible}
                    aria-label="Select all eligible"
                    disabled={eligible.length === 0}
                  />
                </Th>
                <Th>Roll No</Th>
                <Th>Student</Th>
                <Th>Current Class</Th>
                <Th>Current Section</Th>
                <Th>Promote To</Th>
              </Tr>
            </thead>
            <tbody>
              {eligible.map((student) => (
                <Tr key={student.id}>
                  <Td>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={Boolean(selected[student.id])}
                      onChange={() => toggleSelect(student.id)}
                      aria-label={`Select ${student.name}`}
                    />
                  </Td>
                  <Td className="tabular-nums">{student.rollNo}</Td>
                  <Td className="font-medium">{student.name}</Td>
                  <Td>{student.currentClass}</Td>
                  <Td>{student.section}</Td>
                  <Td>
                    {student.isFinalClass ? (
                      <Pill tone="info">{student.promoteTo}</Pill>
                    ) : (
                      student.promoteTo
                    )}
                  </Td>
                </Tr>
              ))}
              {eligible.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    No eligible students for the current filters.
                  </Td>
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

      <Card>
        <CardHeader
          title="Step 4 · Review before confirmation"
          hint="Confirm class, section, and academic year mapping before promotion"
        />
        <CardBody className="space-y-4">
          {promotionValidationErrors.length > 0 ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
              <div className="font-medium text-foreground">Promotion is blocked</div>
              <ul className="mt-2 list-disc pl-5 text-muted-foreground">
                {promotionValidationErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {reviewRows.length > 0 ? (
            <div className="overflow-x-auto">
              <DataTable>
                <thead>
                  <Tr>
                    <Th>Student</Th>
                    <Th>Current Class</Th>
                    <Th>Current Section</Th>
                    <Th>Target Class</Th>
                    <Th>Target Section</Th>
                    <Th>Source Year</Th>
                    <Th>Target Year</Th>
                  </Tr>
                </thead>
                <tbody>
                  {reviewRows.map((row) => (
                    <Tr key={row.id}>
                      <Td className="font-medium">{row.name}</Td>
                      <Td>{row.currentClass}</Td>
                      <Td>{row.currentSection}</Td>
                      <Td>{row.targetClass}</Td>
                      <Td>{row.targetSection}</Td>
                      <Td>{row.sourceYear}</Td>
                      <Td>{row.targetYear}</Td>
                    </Tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select eligible students to review their promotion details before confirmation.
            </p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Review required"
          hint="Students matching selected promotion filters"
        />
        <PageToolbar>
          <ToolbarMeta>{review.length} need review</ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <Tr>
                <Th>Student</Th>
                <Th>Reason</Th>
                <Th>Action</Th>
                <Th>{""}</Th>
              </Tr>
            </thead>
            <tbody>
              {review.map(({ student, reasons }) => {
                const action = reviewActions[student.id] ?? "promote_anyway";
                return (
                  <Tr key={student.id}>
                    <Td>
                      <div className="font-medium">{student.name}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">
                        Roll {student.rollNo} · {student.currentClass}-{student.section}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {reasons.map((reason) => (
                          <Pill key={reason} tone="warning">
                            {reason}
                          </Pill>
                        ))}
                      </div>
                    </Td>
                    <Td>
                      <Select
                        fieldSize="compact"
                        className="min-w-[10rem]"
                        value={action}
                        onChange={(e) =>
                          setReviewActions((prev) => ({
                            ...prev,
                            [student.id]: e.target.value as PromotionReviewAction,
                          }))
                        }
                      >
                        <option value="promote_anyway">Promote Anyway</option>
                        <option value="repeat">Repeat Class</option>
                        <option value="hold">Hold</option>
                        <option value="transfer">Transfer</option>
                        <option value="dropout">Dropout</option>
                        {student.isFinalClass ? (
                          <option value="graduate">Graduate</option>
                        ) : null}
                      </Select>
                    </Td>
                    <Td align="right">
                      <Button size="sm" variant="outline" onClick={() => applyReviewAction(student)}>
                        Apply
                      </Button>
                    </Td>
                  </Tr>
                );
              })}
              {review.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    {selectedFilterKeys.length === 0
                      ? "Turn on filters in Step 2 to flag students for review."
                      : "No students match the selected filters."}
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
