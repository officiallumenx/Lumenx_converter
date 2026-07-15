import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import type { SportsTeamGroupInput, SportsUnitType } from "@/lib/activity/sports/types";
import { SPORTS_UNIT_TYPE_LABELS } from "@/lib/activity/sports/types";

const EMPTY: Omit<SportsTeamGroupInput, "sectionId"> = {
  name: "",
  unitType: "team",
  studentCapacity: 15,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionId: string;
  onSubmit: (input: SportsTeamGroupInput) => Promise<void>;
};

export function SportsTeamFormDialog({ open, onOpenChange, sectionId, onSubmit }: Props) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const handleSubmit = async () => {
    if (!form.name.trim() || form.studentCapacity < 1) return;
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        sectionId,
        name: form.name.trim(),
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create team / group</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Name <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Team 1, Group A"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Type <span className="text-destructive">*</span>
            </label>
            <Select
              value={form.unitType}
              onValueChange={(v) => setForm((p) => ({ ...p, unitType: v as SportsUnitType }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SPORTS_UNIT_TYPE_LABELS) as [SportsUnitType, string][]).map(
                  ([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              No. of students <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min={1}
              max={99}
              value={form.studentCapacity}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  studentCapacity: Math.max(1, Number(e.target.value) || 1),
                }))
              }
              className="rounded-xl"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            disabled={saving || !form.name.trim()}
            onClick={() => void handleSubmit()}
          >
            {saving ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
