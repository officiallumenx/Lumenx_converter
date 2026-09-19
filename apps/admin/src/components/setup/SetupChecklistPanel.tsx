import { Link } from "@tanstack/react-router";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import {
  CheckCircle2,
  Circle,
  Lock,
  ArrowRight,
  ListChecks,
} from "lucide-react";
import type { SetupChecklistState, SetupStepProgress } from "@/lib/institute-setup-checklist";

function StepIcon({ state }: { state: SetupStepProgress["state"] }) {
  if (state === "done") {
    return <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />;
  }
  if (state === "blocked") {
    return <Lock className="size-4 text-muted-foreground shrink-0" />;
  }
  return <Circle className="size-4 text-primary shrink-0" />;
}

function StepRow({ step, current }: { step: SetupStepProgress; current: boolean }) {
  const actionable = step.state === "todo" || step.state === "done";
  const body = (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${
        current
          ? "border-primary/40 bg-primary/5"
          : step.state === "done"
            ? "border-border bg-muted/20"
            : "border-border"
      } ${step.state === "blocked" ? "opacity-70" : ""}`}
    >
      <StepIcon state={step.state} />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{step.title}</span>
          {step.kind === "core" ? (
            <Pill tone="neutral">Core</Pill>
          ) : (
            <Pill tone="neutral">Optional</Pill>
          )}
          {current ? <Pill tone="info">Next</Pill> : null}
          {step.state === "done" ? <Pill tone="success">Done</Pill> : null}
        </div>
        <p className="text-xs text-muted-foreground">{step.description}</p>
        <p className="text-xs text-muted-foreground">{step.detail}</p>
        {step.blockedReason ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">{step.blockedReason}</p>
        ) : null}
      </div>
      {actionable ? (
        <ArrowRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
      ) : null}
    </div>
  );

  if (!actionable) return body;

  return (
    <Link
      to={step.href}
      search={step.search}
      className="block hover:opacity-95 transition-opacity"
    >
      {body}
    </Link>
  );
}

export function SetupChecklistPanel({
  state,
}: {
  state: SetupChecklistState;
}) {
  if (state.status === "needs_institute") {
    return (
      <Card>
        <CardHeader title="Institute setup" hint="Select an institute to continue" />
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Choose an institute first, then finish the setup steps in order.
        </p>
      </Card>
    );
  }

  if (state.status === "loading") {
    return (
      <Card>
        <CardHeader title="Institute setup" hint="Checking progress…" />
        <p className="px-5 pb-5 text-sm text-muted-foreground">Loading setup checklist…</p>
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardHeader title="Institute setup" hint="Could not load progress" />
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          {state.errorMessage ?? "Failed to load setup checklist."}
        </p>
      </Card>
    );
  }

  const next = state.steps.find((s) => s.state === "todo") ?? null;
  const coreSteps = state.steps.filter((s) => s.kind === "core");
  const extendedSteps = state.steps.filter((s) => s.kind === "extended");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Institute setup"
          hint={
            state.coreComplete
              ? "Core setup complete · optional modules below"
              : `Finish core setup · ${state.coreDone}/${state.coreTotal}`
          }
          action={
            <Pill tone={state.coreComplete ? "success" : "info"}>
              {state.coreDone}/{state.coreTotal} core
            </Pill>
          }
        />
        <div className="px-5 pb-5 space-y-3">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{
                width: `${state.coreTotal ? Math.round((state.coreDone / state.coreTotal) * 100) : 0}%`,
              }}
            />
          </div>
          {next ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Next up:</span>
              <Link to={next.href} search={next.search}>
                <Button variant="primary" size="sm">
                  <ListChecks className="size-3.5" />
                  {next.title}
                </Button>
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All tracked setup steps are complete for this institute.
            </p>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Core" hint="Required for Connect and day-to-day modules" />
        <div className="px-3 pb-3 space-y-2">
          {coreSteps.map((step) => (
            <StepRow key={step.id} step={step} current={next?.id === step.id} />
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Optional"
          hint={`${state.extendedDone}/${state.extendedTotal} ready`}
        />
        <div className="px-3 pb-3 space-y-2">
          {extendedSteps.map((step) => (
            <StepRow key={step.id} step={step} current={next?.id === step.id} />
          ))}
        </div>
      </Card>
    </div>
  );
}

export function SetupChecklistBanner({
  state,
}: {
  state: SetupChecklistState;
}) {
  if (state.status !== "ready" || state.coreComplete) return null;

  const next = state.steps.find((s) => s.state === "todo");

  return (
    <Card>
      <div className="px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-semibold text-foreground">
            Finish institute setup ({state.coreDone}/{state.coreTotal})
          </p>
          <p className="text-xs text-muted-foreground">
            {next
              ? `Next: ${next.title} — ${next.description}`
              : "Continue setup so Connect and Transport can share live data."}
          </p>
        </div>
        <Link to="/setup">
          <Button variant="primary" size="sm">
            Open checklist
            <ArrowRight className="size-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}
