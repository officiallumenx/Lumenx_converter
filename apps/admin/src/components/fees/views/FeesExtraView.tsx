import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Field,
  TextInput,
  Modal,
  DataTable,
  Th,
  Td,
  Tr,
  PageStack,
  Pill,
} from "@lumenx/ui-admin";
import {
  formatInr,
  listKnownClassKeys,
  removeCategory,
  upsertCustomCategory,
  type FeesSnapshot,
} from "@lumenx/module-fees";
import { notifyFeeAdded, pushFeesParentInbox } from "@lumenx/notifications";
import { useAdminToast } from "@/components/AdminActionToast";
import { FeesClassChecklist } from "@/components/fees/FeesClassChecklist";
import { Plus, Trash2 } from "lucide-react";

export function FeesExtraView({
  snapshot,
  onChange,
  writesEnabled = true,
}: {
  snapshot: FeesSnapshot;
  onChange: (next: FeesSnapshot) => void;
  writesEnabled?: boolean;
}) {
  const notify = useAdminToast();
  const classKeys = useMemo(() => listKnownClassKeys(snapshot), [snapshot]);
  const customs = snapshot.categories.filter((c) => c.key === "custom");

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [flatAmount, setFlatAmount] = useState("");
  const [scopeAll, setScopeAll] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  const openAdd = () => {
    setName("");
    setFlatAmount("");
    setScopeAll(true);
    setSelectedClasses([]);
    setOpen(true);
  };

  const save = () => {
    if (!writesEnabled) return;
    if (!name.trim()) {
      notify("Enter a fee name");
      return;
    }
    const amount = Number(flatAmount.replace(/,/g, "")) || 0;
    const targets = scopeAll ? classKeys : selectedClasses;
    if (!targets.length) {
      notify("Select at least one class");
      return;
    }
    const amountsByClass: Record<string, number> = {};
    for (const ck of targets) amountsByClass[ck] = amount;
    const next = upsertCustomCategory(snapshot, {
      name: name.trim(),
      assignedToAll: scopeAll,
      assignedClassKeys: scopeAll ? [] : targets,
      amountsByClass,
    });
    onChange(next);
    setOpen(false);
    try {
      const added = notifyFeeAdded({
        feeLabel: name.trim(),
        amount: formatInr(amount),
        categoryId: next.categories.find((c) => c.name === name.trim())?.id,
      });
      pushFeesParentInbox(added.appNotification);
    } catch {
      /* best-effort */
    }
    notify(`Added ${name.trim()}`);
  };

  const remove = (id: string, label: string) => {
    if (!writesEnabled) return;
    onChange(removeCategory(snapshot, id));
    notify(`Removed ${label}`);
  };

  return (
    <PageStack>
      <Card>
        <CardHeader
          title="Extra fee fields"
          hint="Add custom categories · assign amount and classes"
          action={
            writesEnabled ? (
            <Button size="sm" variant="primary" onClick={openAdd}>
              <Plus className="size-3.5" /> Add field
            </Button>
            ) : undefined
          }
        />
        <CardBody className="p-0">
          {customs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground text-center">
              No extra fees yet. Add fields such as Examination, Lab, or Activity.
            </p>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Assigned classes</Th>
                  <Th>Sample amount</Th>
                  {writesEnabled ? <Th align="right">Actions</Th> : null}
                </tr>
              </thead>
              <tbody>
                {customs.map((c) => {
                  const sampleKey = c.assignedToAll
                    ? classKeys[0]
                    : (c.assignedClassKeys[0] ?? classKeys[0]);
                  const sample = sampleKey
                    ? snapshot.classDefaults[sampleKey]?.[c.id]
                    : undefined;
                  return (
                    <Tr key={c.id}>
                      <Td className="font-medium">{c.name}</Td>
                      <Td>
                        {c.assignedToAll ? (
                          <Pill tone="success">All classes</Pill>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {c.assignedClassKeys.map((ck) => (
                              <span
                                key={ck}
                                className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-medium"
                              >
                                {ck}
                              </span>
                            ))}
                          </div>
                        )}
                      </Td>
                      <Td mono>{sample != null ? formatInr(sample) : "—"}</Td>
                      {writesEnabled ? (
                      <Td align="right">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => remove(c.id, c.name)}
                          aria-label={`Remove ${c.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </tbody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      {writesEnabled ? (
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add extra fee"
        subtitle="Choose entire institute or tick specific classes"
        size="md"
        footer={
          <>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={save}>
              Save field
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Fee name" required>
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Examination fee"
              autoFocus
            />
          </Field>
          <Field label="Amount (₹)" required hint="Applied to each selected class">
            <TextInput
              value={flatAmount}
              onChange={(e) => setFlatAmount(e.target.value)}
              placeholder="3500"
              className="font-mono"
            />
          </Field>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Assign to
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setScopeAll(true);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  scopeAll
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Entire institute
                <div className="mt-0.5 text-[10px] font-normal opacity-80">All classes</div>
              </button>
              <button
                type="button"
                onMouseDown={(e) => {
                  // Use mousedown so mouseup after layout shift does not hit "Select all"
                  e.preventDefault();
                  setScopeAll(false);
                  setSelectedClasses([]);
                }}
                className={`rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-colors ${
                  !scopeAll
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Selected classes
                <div className="mt-0.5 text-[10px] font-normal opacity-80">
                  Pick which classes
                </div>
              </button>
            </div>
          </div>
          {!scopeAll ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Classes <span className="text-destructive">*</span>
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Click to select · X to remove
                </span>
              </div>
              <FeesClassChecklist
                classKeys={classKeys}
                selected={selectedClasses}
                onChange={setSelectedClasses}
              />
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground rounded-lg bg-muted/40 px-3 py-2">
            Parents see this category only after you publish, and only for assigned classes.
          </p>
        </div>
      </Modal>
      ) : null}
    </PageStack>
  );
}
