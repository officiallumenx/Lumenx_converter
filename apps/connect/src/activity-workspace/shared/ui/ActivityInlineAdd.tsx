import { Button, Input } from "@lumenx/ui";

/** Consistent add row used across Sports / ECA hierarchy screens. */
export function ActivityInlineAdd({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  submitLabel = "Add",
  disabled,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  submitLabel?: string;
  disabled?: boolean;
}) {
  return (
    <section className="activity-panel space-y-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-11 rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim() && !disabled) onSubmit();
          }}
        />
        <Button
          type="button"
          className="activity-primary-action shrink-0 rounded-xl sm:min-w-[5.5rem]"
          disabled={!value.trim() || disabled}
          onClick={onSubmit}
        >
          {submitLabel}
        </Button>
      </div>
    </section>
  );
}
