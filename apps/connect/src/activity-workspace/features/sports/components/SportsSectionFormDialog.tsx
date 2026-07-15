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
import type {
  SportsProgramSectionInput,
  SportsSectionEnvironment,
} from "@/lib/activity/sports/sections-types";
import { SPORTS_SECTION_ENVIRONMENT_LABELS } from "@/lib/activity/sports/sections-types";

const EMPTY: SportsProgramSectionInput = {
  name: "",
  environment: "outdoor",
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: SportsProgramSectionInput) => Promise<void>;
};

export function SportsSectionFormDialog({ open, onOpenChange, onSubmit }: Props) {
  const [form, setForm] = useState<SportsProgramSectionInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(EMPTY);
  }, [open]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await onSubmit(form);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Create sport section</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Section name <span className="text-destructive">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Cricket, Kabaddi"
              className="rounded-xl"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Sport type <span className="text-destructive">*</span>
            </label>
            <Select
              value={form.environment}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, environment: v as SportsSectionEnvironment }))
              }
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(SPORTS_SECTION_ENVIRONMENT_LABELS) as [SportsSectionEnvironment, string][]).map(
                  ([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
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
            {saving ? "Creating…" : "Create section"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
