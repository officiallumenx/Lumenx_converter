import { cn } from "@lumenx/ui";

export function SignupStepper({
  steps,
  currentIndex,
}: {
  steps: string[];
  currentIndex: number;
}) {
  const currentLabel = steps[currentIndex] ?? steps[steps.length - 1];

  return (
    <div className="mb-6 space-y-3">
      <p className="text-sm text-muted-foreground">
        Step{" "}
        <span className="font-medium text-foreground">{currentIndex + 1}</span>
        {" "}of{" "}
        <span className="font-medium text-foreground">{steps.length}</span>
        {" · "}
        <span className="font-medium text-foreground">{currentLabel}</span>
      </p>

      <div className="flex items-center gap-1.5">
        {steps.map((label, i) => (
          <div
            key={label}
            aria-hidden
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i <= currentIndex ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
