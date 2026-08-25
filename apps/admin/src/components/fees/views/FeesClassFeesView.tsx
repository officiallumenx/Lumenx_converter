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

/** Tuition + books only — transport has its own section. */
const CLASS_FEE_COLS = [
  { id: CORE_CATEGORY_IDS.tuition, label: "Tuition" },
  { id: CORE_CATEGORY_IDS.books, label: "Books" },
] as const;

function buildDraft(
  snapshot: FeesSnapshot,
  classKeys: string[],
): Record<string, Record<string, string>> {
  const init: Record<string, Record<string, string>> = {};
  for (const ck of classKeys) {
    init[ck] = {};
    for (const col of CLASS_FEE_COLS) {
      init[ck][col.id] = String(snapshot.classDefaults[ck]?.[col.id] ?? 0);
    }
  }
  return init;
}

export function FeesClassFeesView({
  snapshot,
  onChange,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
}) {
  const notify = useAdminToast();
  const classKeys = useMemo(() => listKnownClassKeys(snapshot), [snapshot]);
  const [draft, setDraft] = useState(() => buildDraft(snapshot, classKeys));

  useEffect(() => {
    setDraft(buildDraft(snapshot, classKeys));
  }, [snapshot, classKeys]);

  const setCell = (classKey: string, categoryId: string, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [classKey]: { ...(prev[classKey] ?? {}), [categoryId]: value },
    }));
  };

  const saveRow = (classKey: string) => {
    let next = snapshot;
    for (const col of CLASS_FEE_COLS) {
      const raw = draft[classKey]?.[col.id] ?? "0";
      const amount = Number(raw.replace(/,/g, "")) || 0;
      next = setClassDefaultAmount(next, classKey, col.id, amount);
    }
    onChange(next);
    notify(`Tuition & books saved for ${classKey}`);
  };

  const saveAll = () => {
    let next = snapshot;
    for (const ck of classKeys) {
      for (const col of CLASS_FEE_COLS) {
        const raw = draft[ck]?.[col.id] ?? "0";
        const amount = Number(raw.replace(/,/g, "")) || 0;
        next = setClassDefaultAmount(next, ck, col.id, amount);
      }
    }
    onChange(next);
    notify("Class tuition & books saved");
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Class fees"
          hint="Default tuition and books per class · transport is set in Transport fees"
          action={
            <Button size="sm" variant="primary" onClick={saveAll}>
              Save all
            </Button>
          }
        />
        <CardBody className="p-0">
          <DataTable>
            <thead>
              <tr>
                <Th>Class</Th>
                {CLASS_FEE_COLS.map((c) => (
                  <Th key={c.id}>{c.label}</Th>
                ))}
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {classKeys.map((ck) => (
                <Tr key={ck}>
                  <Td className="font-medium whitespace-nowrap">{ck}</Td>
                  {CLASS_FEE_COLS.map((col) => (
                    <Td key={col.id}>
                      <TextInput
                        className="w-[7.5rem] font-mono text-xs"
                        value={draft[ck]?.[col.id] ?? "0"}
                        onChange={(e) => setCell(ck, col.id, e.target.value)}
                        aria-label={`${ck} ${col.label}`}
                      />
                    </Td>
                  ))}
                  <Td align="right">
                    <Button size="sm" onClick={() => saveRow(ck)}>
                      Save
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
          {classKeys.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No classes found. Add classes in the Classes module first.
            </p>
          ) : null}
        </CardBody>
      </Card>
      <p className="text-xs text-muted-foreground px-1">
        Preview · Grade 10 tuition:{" "}
        {formatInr(snapshot.classDefaults["Grade 10"]?.[CORE_CATEGORY_IDS.tuition] ?? 0)}
        {" · "}
        books:{" "}
        {formatInr(snapshot.classDefaults["Grade 10"]?.[CORE_CATEGORY_IDS.books] ?? 0)}
      </p>
    </PageStack>
  );
}
