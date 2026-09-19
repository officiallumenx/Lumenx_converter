import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  DataTable,
  Th,
  Td,
  Tr,
  TextInput,
  PageStack,
} from "@lumenx/ui-admin";
import {
  CORE_CATEGORY_IDS,
  formatInr,
  listKnownClassKeys,
  setClassDefaultAmount,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import { useAdminToast } from "@/components/AdminActionToast";
import {
  findCategoryByKind,
  publishFeePlan,
  replaceCoreClassAmounts,
  syncTuitionBooksRow,
} from "@/lib/fees";
import type { ClassIdsByLabel } from "@/lib/fees/class-ids";

function resolveCoreIds(snapshot: FeesSnapshot) {
  return {
    tuition:
      findCategoryByKind(snapshot, "tuition")?.id ?? CORE_CATEGORY_IDS.tuition,
    books: findCategoryByKind(snapshot, "books")?.id ?? CORE_CATEGORY_IDS.books,
  };
}

function buildDraft(
  snapshot: FeesSnapshot,
  classKeys: string[],
  ids: { tuition: string; books: string },
): Record<string, Record<string, string>> {
  const init: Record<string, Record<string, string>> = {};
  for (const ck of classKeys) {
    init[ck] = {
      [ids.tuition]: String(snapshot.classDefaults[ck]?.[ids.tuition] ?? 0),
      [ids.books]: String(snapshot.classDefaults[ck]?.[ids.books] ?? 0),
    };
  }
  return init;
}

export function FeesClassFeesView({
  snapshot,
  onChange,
  writesEnabled = true,
  apiMode = false,
  feePlanId = null,
  classIdByLabel = {},
  classIdsByLabel = {},
  onApiReload,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
  writesEnabled?: boolean;
  apiMode?: boolean;
  feePlanId?: string | null;
  classIdByLabel?: Record<string, string>;
  classIdsByLabel?: ClassIdsByLabel;
  onApiReload?: () => void;
}) {
  const notify = useAdminToast();
  const classKeys = useMemo(() => listKnownClassKeys(snapshot), [snapshot]);
  const ids = useMemo(() => resolveCoreIds(snapshot), [snapshot]);
  const cols = useMemo(
    () =>
      [
        { id: ids.tuition, label: "Tuition" },
        { id: ids.books, label: "Books" },
      ] as const,
    [ids],
  );
  const [draft, setDraft] = useState(() => buildDraft(snapshot, classKeys, ids));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(buildDraft(snapshot, classKeys, ids));
  }, [snapshot, classKeys, ids]);

  const setCell = (classKey: string, categoryId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [classKey]: { ...(prev[classKey] ?? {}), [categoryId]: value },
    }));
  };

  const parseAmount = (raw: string | undefined) =>
    Number((raw ?? "0").replace(/,/g, "")) || 0;

  const saveRow = (classKey: string) => {
    if (!writesEnabled || saving) return;
    const tuition = parseAmount(draft[classKey]?.[ids.tuition]);
    const books = parseAmount(draft[classKey]?.[ids.books]);

    if (apiMode) {
      if (!feePlanId) {
        notify("No fee plan available");
        return;
      }
      setSaving(true);
      void syncTuitionBooksRow({
        feePlanId,
        snapshot,
        classIdByLabel,
        classIdsByLabel,
        classKey,
        tuition,
        books,
      })
        .then(() => {
          onApiReload?.();
          notify(`Tuition & books saved for ${classKey}`);
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : "Failed to save class fees");
        })
        .finally(() => setSaving(false));
      return;
    }

    let next = snapshot;
    next = setClassDefaultAmount(next, classKey, ids.tuition, tuition);
    next = setClassDefaultAmount(next, classKey, ids.books, books);
    onChange(next);
    notify(`Tuition & books saved for ${classKey}`);
  };

  const persistAllAmounts = async (): Promise<void> => {
    if (apiMode) {
      if (!feePlanId) {
        throw new Error("No fee plan available");
      }
      const tuitionByClass: Record<string, number> = {};
      const booksByClass: Record<string, number> = {};
      for (const ck of classKeys) {
        tuitionByClass[ck] = parseAmount(draft[ck]?.[ids.tuition]);
        booksByClass[ck] = parseAmount(draft[ck]?.[ids.books]);
      }
      await replaceCoreClassAmounts({
        feePlanId,
        snapshot,
        classIdByLabel,
        classIdsByLabel,
        kind: "tuition",
        name: "Tuition",
        amountsByClassKey: tuitionByClass,
      });
      await replaceCoreClassAmounts({
        feePlanId,
        snapshot,
        classIdByLabel,
        classIdsByLabel,
        kind: "books",
        name: "Books",
        amountsByClassKey: booksByClass,
      });
      return;
    }

    let next = snapshot;
    for (const ck of classKeys) {
      next = setClassDefaultAmount(
        next,
        ck,
        ids.tuition,
        parseAmount(draft[ck]?.[ids.tuition]),
      );
      next = setClassDefaultAmount(
        next,
        ck,
        ids.books,
        parseAmount(draft[ck]?.[ids.books]),
      );
    }
    onChange(next);
  };

  const saveAll = () => {
    if (!writesEnabled || saving) return;
    setSaving(true);
    void persistAllAmounts()
      .then(() => {
        onApiReload?.();
        notify("Class tuition & books saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save class fees");
      })
      .finally(() => setSaving(false));
  };

  const saveAndPublish = () => {
    if (!writesEnabled || saving) return;
    setSaving(true);
    void persistAllAmounts()
      .then(async () => {
        if (apiMode && feePlanId) {
          await publishFeePlan(feePlanId, { publishScope: "institute" });
        }
        onApiReload?.();
        notify(
          apiMode
            ? "Class fees saved & published"
            : "Class tuition & books saved",
        );
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save & publish");
      })
      .finally(() => setSaving(false));
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Class fees"
          hint={
            writesEnabled
              ? apiMode
                ? "Default tuition and books per class · saved via fees components API"
                : "Default tuition and books per class · transport is set in Transport fees"
              : "View-only tuition and books"
          }
          action={
            writesEnabled ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void saveAll()} disabled={saving}>
                  Save all
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveAndPublish}
                  disabled={saving}
                >
                  Save & publish
                </Button>
              </div>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          <DataTable>
            <thead>
              <tr>
                <Th>Class</Th>
                {cols.map((c) => (
                  <Th key={c.id}>{c.label}</Th>
                ))}
                {writesEnabled ? <Th align="right">Actions</Th> : null}
              </tr>
            </thead>
            <tbody>
              {classKeys.map((ck) => (
                <Tr key={ck}>
                  <Td className="font-medium whitespace-nowrap">{ck}</Td>
                  {cols.map((col) => (
                    <Td key={col.id}>
                      <TextInput
                        className="w-[7.5rem] font-mono text-xs"
                        disabled={!writesEnabled || saving}
                        value={draft[ck]?.[col.id] ?? "0"}
                        onChange={(e) => setCell(ck, col.id, e.target.value)}
                        aria-label={`${ck} ${col.label}`}
                      />
                    </Td>
                  ))}
                  {writesEnabled ? (
                    <Td align="right">
                      <Button size="sm" onClick={() => saveRow(ck)} disabled={saving}>
                        Save
                      </Button>
                    </Td>
                  ) : null}
                </Tr>
              ))}
            </tbody>
          </DataTable>
          {classKeys.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No classes found. Add classes in the Classes module first.
            </p>
          ) : (
            <p className="px-4 py-3 text-[11px] text-muted-foreground border-t border-border">
              Amounts shown in INR · sample row total{" "}
              {formatInr(
                parseAmount(draft[classKeys[0]]?.[ids.tuition]) +
                  parseAmount(draft[classKeys[0]]?.[ids.books]),
              )}
            </p>
          )}
        </CardBody>
      </Card>
    </PageStack>
  );
}
