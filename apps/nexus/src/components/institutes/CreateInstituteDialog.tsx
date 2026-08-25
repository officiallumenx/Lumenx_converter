import {
  Button,
  Field,
  FormGrid,
  FormStack,
  Modal,
  Select,
  TextInput,
} from "@lumenx/ui-admin";
import { useMemo, useState } from "react";
import {
  NEXUS_MODULE_CATALOG,
  createPlatformInstitute,
  defaultCreateForm,
  type CreateInstituteInput,
  type PlanTier,
  type PlatformInstitute,
} from "@/lib/institute-directory-store";
import type { BillingCadence } from "@/lib/institute-licensing-store";
import { compressInstituteLogoDataUrl } from "@lumenx/utils";
import { InstituteLogo } from "@/components/institutes/InstituteDirectoryCard";

export function CreateInstituteDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (inst: PlatformInstitute) => void;
}) {
  const [form, setForm] = useState<CreateInstituteInput>(() => defaultCreateForm());
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);

  const groups = useMemo(
    () => Array.from(new Set(NEXUS_MODULE_CATALOG.map((m) => m.group))),
    [],
  );

  const patch = <K extends keyof CreateInstituteInput>(key: K, value: CreateInstituteInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  };

  const toggleModule = (id: string) => {
    setForm((prev) => ({
      ...prev,
      modules: { ...prev.modules, [id]: !prev.modules[id] },
    }));
  };

  const reset = () => {
    setForm(defaultCreateForm());
    setError(null);
    setLogoBusy(false);
  };

  const onLogoFile = async (file: File | null) => {
    if (!file) {
      patch("logoUrl", "");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file.");
      return;
    }
    setLogoBusy(true);
    setError(null);
    try {
      const raw = await readFileAsDataUrl(file);
      const compressed = await compressInstituteLogoDataUrl(raw, {
        maxEdge: 160,
        quality: 0.72,
        maxDataUrlChars: 120_000,
      });
      patch("logoUrl", compressed ?? raw);
    } catch {
      setError("Could not read logo image.");
    } finally {
      setLogoBusy(false);
    }
  };

  const submit = () => {
    if (!form.name.trim()) {
      setError("Institute name is required.");
      return;
    }
    if (!form.city.trim() || !form.state.trim()) {
      setError("City and state are required for platform onboarding.");
      return;
    }
    if (!form.contactEmail.trim()) {
      setError("Institute contact email is required.");
      return;
    }
    if (!form.billingStartAt.trim()) {
      setError("Billing / renewal start is required.");
      return;
    }
    const created = createPlatformInstitute(form);
    reset();
    onCreated(created);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create institute"
      subtitle="Platform onboarding only · no Admin operational records"
      size="xl"
      footer={
        <>
          <Button
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={logoBusy}>
            Create institute
          </Button>
        </>
      }
    >
      <FormStack>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          Institute profile
        </div>
        <div className="flex items-center gap-4">
          <InstituteLogo
            mark={form.name.trim().slice(0, 2).toUpperCase() || "LX"}
            hue={210}
            src={form.logoUrl || null}
            name={form.name || "New institute"}
            size="lg"
          />
          <Field label="Institute logo" hint="PNG / JPG · shown on Institutes directory">
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium"
              onChange={(e) => void onLogoFile(e.target.files?.[0] ?? null)}
            />
            {form.logoUrl ? (
              <button
                type="button"
                className="mt-1.5 text-[11px] text-muted-foreground underline"
                onClick={() => patch("logoUrl", "")}
              >
                Remove logo
              </button>
            ) : null}
          </Field>
        </div>
        <FormGrid>
          <Field label="Institute name" required>
            <TextInput
              value={form.name}
              onChange={(e) => patch("name", e.target.value)}
              placeholder="e.g. Lakeview Public School"
            />
          </Field>
          <Field label="Institute type">
            <TextInput
              value={form.instituteType}
              onChange={(e) => patch("instituteType", e.target.value)}
              placeholder="School / Academy / International"
            />
          </Field>
          <Field label="Board">
            <TextInput value={form.board} onChange={(e) => patch("board", e.target.value)} />
          </Field>
          <Field label="Country">
            <TextInput value={form.country} onChange={(e) => patch("country", e.target.value)} />
          </Field>
          <Field label="City" required>
            <TextInput value={form.city} onChange={(e) => patch("city", e.target.value)} />
          </Field>
          <Field label="State" required>
            <TextInput value={form.state} onChange={(e) => patch("state", e.target.value)} />
          </Field>
          <Field label="Address line" className="sm:col-span-2">
            <TextInput
              value={form.addressLine}
              onChange={(e) => patch("addressLine", e.target.value)}
              placeholder="Street / campus address"
            />
          </Field>
          <Field label="Pincode">
            <TextInput value={form.pincode} onChange={(e) => patch("pincode", e.target.value)} />
          </Field>
          <Field label="Contact email" required>
            <TextInput
              type="email"
              value={form.contactEmail}
              onChange={(e) => patch("contactEmail", e.target.value)}
              placeholder="ops@institute.edu.in"
            />
          </Field>
          <Field label="Contact phone">
            <TextInput
              value={form.contactPhone}
              onChange={(e) => patch("contactPhone", e.target.value)}
              placeholder="+91 …"
            />
          </Field>
        </FormGrid>

        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-2">
          Commercial & lifecycle
        </div>
        <FormGrid>
          <Field label="Initial status" required>
            <Select
              value={form.initialStatus}
              onChange={(e) => patch("initialStatus", e.target.value as "trial" | "active")}
            >
              <option value="trial">Trial</option>
              <option value="active">Active</option>
            </Select>
          </Field>
          <Field label="Initial plan" required>
            <Select
              value={form.plan}
              onChange={(e) => patch("plan", e.target.value as PlanTier)}
            >
              <option value="core">Core</option>
              <option value="plus">Plus</option>
              <option value="max">Max</option>
            </Select>
          </Field>
          <Field label="Billing model" required>
            <Select
              value={form.billingCadence}
              onChange={(e) => patch("billingCadence", e.target.value as BillingCadence)}
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </Select>
          </Field>
          <Field label="Amount (₹)" required>
            <TextInput
              type="number"
              min={0}
              value={String(form.amountInr)}
              onChange={(e) => patch("amountInr", Number(e.target.value) || 0)}
            />
          </Field>
          <Field label="Billing / renewal start" required hint="Used for renewal schedule" className="sm:col-span-2">
            <TextInput
              type="datetime-local"
              value={form.billingStartAt}
              onChange={(e) => patch("billingStartAt", e.target.value)}
            />
          </Field>
        </FormGrid>

        <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground pt-2">
          Enabled modules
        </div>
        <p className="text-[11px] text-muted-foreground -mt-1">
          Platform licensing only. Does not create students, teachers, parents, classes, or attendance
          records.
        </p>
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group}>
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                {group}
              </div>
              <div className="flex flex-wrap gap-2">
                {NEXUS_MODULE_CATALOG.filter((m) => m.group === group).map((m) => {
                  const on = !!form.modules[m.id];
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleModule(m.id)}
                      className={`rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                        on
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-surface-hover"
                      }`}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FormStack>
    </Modal>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(file);
  });
}
