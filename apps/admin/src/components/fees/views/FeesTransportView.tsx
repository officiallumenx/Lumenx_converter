import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  DataTable,
  Field,
  FormGrid,
  Kpi,
  KpiGrid,
  PageStack,
  PageToolbar,
  Pill,
  Select,
  Th,
  Td,
  Tr,
  TextInput,
  ToolbarGroup,
  ToolbarMeta,
  ToolbarSpacer,
} from "@lumenx/ui-admin";
import {
  CORE_CATEGORY_IDS,
  clearStudentOverride,
  formatInr,
  listKnownClassKeys,
  setClassDefaultAmount,
  setStudentOverride,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  deleteConcession,
  findCategoryByKind,
  upsertConcession,
  upsertCoreClassAmount,
} from "@/lib/fees";
import {
  feesStudentClasses,
  feesStudentSections,
  feesStudentsFor,
  findFeesStudent,
  type FeesStudentOption,
} from "@/lib/fees-students";

/**
 * Transport fees — Admin negotiates with parents only.
 * Not linked to bus stops (driver owns stops separately).
 */
export function FeesTransportView({
  snapshot,
  onChange,
  writesEnabled = true,
  studentOptions,
  studentsPickerReady = true,
  studentsPickerHint = null,
  apiMode = false,
  feePlanId = null,
  classIdByLabel = {},
  onApiReload,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
  writesEnabled?: boolean;
  studentOptions: FeesStudentOption[];
  studentsPickerReady?: boolean;
  studentsPickerHint?: string | null;
  apiMode?: boolean;
  feePlanId?: string | null;
  classIdByLabel?: Record<string, string>;
  onApiReload?: () => void;
}) {
  const notify = useAdminToast();
  const catId =
    findCategoryByKind(snapshot, "transport")?.id ?? CORE_CATEGORY_IDS.transport;
  const classKeys = useMemo(() => listKnownClassKeys(snapshot), [snapshot]);

  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [feeDraft, setFeeDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  useEffect(() => {
    setClassFilter("all");
    setSectionFilter("all");
  }, [studentOptions]);

  const sectionOptions = useMemo(() => {
    if (classFilter === "all") {
      return [...new Set(studentOptions.map((s) => `${s.classKey}::${s.section}`))].map(
        (value) => {
          const [classKey, section] = value.split("::");
          return { value, classKey, section };
        },
      );
    }
    return feesStudentSections(studentOptions, classFilter).map((section) => ({
      value: `${classFilter}::${section}`,
      classKey: classFilter,
      section,
    }));
  }, [classFilter, studentOptions]);

  const activeSection = sectionFilter === "all" ? undefined : sectionOptions.find((s) => s.value === sectionFilter);
  const sectionStudents = useMemo(() => {
    if (!activeSection) return [];
    return feesStudentsFor(studentOptions, activeSection.classKey, activeSection.section);
  }, [activeSection, studentOptions]);

  const existingOverride = useMemo(() => {
    if (!activeSection) return [];
    const ids = new Set(sectionStudents.map((student) => student.id));
    return snapshot.overrides.filter(
      (o) => ids.has(o.studentId) && o.categoryId === catId,
    );
  }, [snapshot.overrides, sectionStudents, activeSection, catId]);

  const classDefault = activeSection
    ? (snapshot.classDefaults[activeSection.classKey]?.[catId] ?? 0)
    : 0;

  const sectionAmount = useMemo(() => {
    if (!activeSection) return 0;
    if (existingOverride.length === 0) return classDefault;
    const values = existingOverride.map((item) => item.amount);
    return values.every((value) => value === values[0]) ? values[0] : classDefault;
  }, [activeSection, existingOverride, classDefault]);

  useEffect(() => {
    if (existingOverride.length > 0) {
      setFeeDraft(String(sectionAmount));
      setNoteDraft(existingOverride[0]?.note ?? "");
    } else {
      setFeeDraft(String(classDefault || 0));
      setNoteDraft("");
    }
  }, [existingOverride, classDefault, sectionAmount]);

  const transportOverrides = useMemo(
    () => snapshot.overrides.filter((o) => o.categoryId === catId),
    [snapshot.overrides, catId],
  );

  const saveSectionFee = () => {
    if (!writesEnabled) return;
    if (!activeSection || sectionStudents.length === 0) {
      notify("Select a section");
      return;
    }
    const amount = Number(feeDraft.replace(/,/g, "")) || 0;
    if (apiMode) {
      if (!feePlanId) {
        notify("No fee plan available");
        return;
      }
      const componentId = findCategoryByKind(snapshot, "transport")?.id;
      if (!componentId) {
        notify("Create a transport class default first");
        return;
      }
      void Promise.all(
        sectionStudents.map((student) =>
          upsertConcession({
            feePlanId,
            studentId: student.id,
            feeComponentId: componentId,
            amount,
            note: noteDraft.trim() || `Section ${activeSection.section}`,
          }),
        ),
      )
        .then(() => {
          onApiReload?.();
          notify(
            `Transport fee saved for ${activeSection.classKey} · Section ${activeSection.section}`,
          );
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save transport fees");
        });
      return;
    }
    let next = snapshot;
    for (const student of sectionStudents) {
      next = setStudentOverride(next, {
        studentId: student.id,
        categoryId: catId,
        amount,
        note: noteDraft.trim() || `Section ${activeSection.section}`,
      });
    }
    onChange(next);
    notify(`Transport fee saved for ${activeSection.classKey} · Section ${activeSection.section}`);
  };

  const clearSectionFee = () => {
    if (!writesEnabled || !activeSection) return;
    if (apiMode) {
      const toDelete = existingOverride
        .map((o) => o.id)
        .filter((id): id is string => Boolean(id));
      if (toDelete.length === 0) {
        notify("No API concessions to clear for this section");
        return;
      }
      void Promise.all(toDelete.map((id) => deleteConcession(id)))
        .then(() => {
          onApiReload?.();
          notify(
            `Cleared negotiated fee for ${activeSection.classKey} · Section ${activeSection.section}`,
          );
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to clear transport fees");
        });
      return;
    }
    let next = snapshot;
    for (const student of sectionStudents) {
      next = clearStudentOverride(next, student.id, catId);
    }
    onChange(next);
    notify(`Cleared negotiated fee for ${activeSection.classKey} · Section ${activeSection.section}`);
  };

  const [classDraft, setClassDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    const next: Record<string, string> = {};
    for (const ck of classKeys) {
      next[ck] = String(snapshot.classDefaults[ck]?.[catId] ?? 0);
    }
    setClassDraft(next);
  }, [snapshot, classKeys, catId]);

  const saveClassRow = (classKey: string) => {
    if (!writesEnabled) return;
    const amount = Number((classDraft[classKey] ?? "0").replace(/,/g, "")) || 0;
    if (apiMode) {
      if (!feePlanId) {
        notify("No fee plan available");
        return;
      }
      void upsertCoreClassAmount({
        feePlanId,
        snapshot,
        classIdByLabel,
        kind: "transport",
        name: "Transport",
        classKey,
        amount,
      })
        .then(() => {
          onApiReload?.();
          notify(`Class transport default saved for ${classKey}`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save transport default");
        });
      return;
    }
    onChange(setClassDefaultAmount(snapshot, classKey, catId, amount));
    notify(`Class transport default saved for ${classKey}`);
  };

  return (
    <PageStack>
      {!studentsPickerReady ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {studentsPickerHint ?? "Loading students for transport fee picker…"}
        </div>
      ) : (
      <>
      <KpiGrid cols={4}>
        <Kpi label="Students with negotiated fee" value={String(transportOverrides.length)} />
        <Kpi label="Class defaults" value={String(classKeys.length)} />
        <Kpi
          label="Selected"
          value={activeSection ? formatInr(Number(feeDraft.replace(/,/g, "")) || 0) : "—"}
          delta={existingOverride.length > 0 ? "Section fee" : "Class default"}
        />
      </KpiGrid>

      <Card>
        <CardHeader
          title="Transport fee · section"
          hint="Set one transport fee for a class section · not linked to bus stops"
          action={
            writesEnabled ? (
            <div className="flex flex-wrap gap-2">
              {activeSection && existingOverride.length > 0 ? (
                <Button size="sm" variant="outline" onClick={clearSectionFee}>
                  Use class default
                </Button>
              ) : null}
              <Button size="sm" variant="primary" onClick={saveSectionFee} disabled={!activeSection}>
                Save fee
              </Button>
            </div>
            ) : undefined
          }
        />
        <CardBody className="border-b border-border">
          <FormGrid cols={2}>
            <Field label="Class filter">
              <Select
                value={classFilter}
                onChange={(e) => {
                  const nextClass = e.target.value;
                  setClassFilter(nextClass);
                  setSectionFilter("all");
                }}
              >
                <option value="all">All classes</option>
                {feesStudentClasses(studentOptions).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Section" required>
              <Select value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
                <option value="all">Select section</option>
                {sectionOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.classKey} · Section {s.section}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Transport fee (₹)" required>
              <TextInput
                className="font-mono"
                value={feeDraft}
                disabled={!writesEnabled}
                onChange={(e) => setFeeDraft(e.target.value)}
                placeholder="Amount for this section"
              />
            </Field>
            <Field label="Note">
              <TextInput
                value={noteDraft}
                disabled={!writesEnabled}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="e.g. Section B · Jul 2026"
              />
            </Field>
          </FormGrid>
          {activeSection ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Class default for {activeSection.classKey}:{" "}
              <span className="font-medium text-foreground">{formatInr(classDefault)}</span>
              {existingOverride.length > 0 ? (
                <>
                  {" · "}
                  <Pill tone="info">Section override</Pill>
                </>
              ) : (
                <>
                  {" · "}
                  <Pill tone="neutral">Using class default</Pill>
                </>
              )}
              {` · ${sectionStudents.length} students in Section ${activeSection.section}.`} Stops are managed in Transport — fees stay here.
            </p>
          ) : null}
        </CardBody>
        <PageToolbar>
          <ToolbarGroup>
            <ToolbarMeta>Saved transport overrides</ToolbarMeta>
          </ToolbarGroup>
          <ToolbarSpacer />
          <ToolbarMeta>{transportOverrides.length} saved</ToolbarMeta>
        </PageToolbar>
        <CardBody className="p-0 overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                <Th>Student</Th>
                <Th>Class</Th>
                <Th>Section</Th>
                <Th>Fee (₹)</Th>
                <Th>Note</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {transportOverrides.map((o) => {
                const s = findFeesStudent(studentOptions, o.studentId);
                return (
                  <Tr key={`${o.studentId}-${o.categoryId}`}>
                    <Td className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => {
                          if (!s) return;
                          setClassFilter(s.classKey);
                          setSectionFilter(`${s.classKey}::${s.section}`);
                        }}
                      >
                        {s?.name ?? o.studentId}
                      </button>
                    </Td>
                    <Td>{s?.classKey ?? "—"}</Td>
                    <Td>{s?.section ?? "—"}</Td>
                    <Td className="tabular-nums">{formatInr(o.amount)}</Td>
                    <Td className="text-muted-foreground text-xs max-w-[14rem] truncate">
                      {o.note ?? "—"}
                    </Td>
                    <Td className="text-muted-foreground tabular-nums text-xs">{o.updatedAt}</Td>
                  </Tr>
                );
              })}
              {transportOverrides.length === 0 ? (
                <Tr>
                  <Td className="text-muted-foreground py-8">
                    No section transport fees yet. Select a class and section, then save.
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
          title="Class transport defaults"
          hint="Fallback when no parent agreement · still not linked to stops"
        />
        <CardBody className="p-0">
          <DataTable>
            <thead>
              <tr>
                <Th>Class</Th>
                <Th>Transport (₹)</Th>
                {writesEnabled ? <Th align="right">Actions</Th> : null}
              </tr>
            </thead>
            <tbody>
              {classKeys.map((ck) => (
                <Tr key={ck}>
                  <Td className="font-medium whitespace-nowrap">{ck}</Td>
                  <Td>
                    <TextInput
                      className="w-[7.5rem] font-mono text-xs"
                      disabled={!writesEnabled}
                      value={classDraft[ck] ?? "0"}
                      onChange={(e) =>
                        setClassDraft((prev) => ({ ...prev, [ck]: e.target.value }))
                      }
                      aria-label={`${ck} transport`}
                    />
                  </Td>
                  {writesEnabled ? (
                  <Td align="right">
                    <Button size="sm" onClick={() => saveClassRow(ck)}>
                      Save
                    </Button>
                  </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </CardBody>
      </Card>
      </>
      )}
    </PageStack>
  );
}
