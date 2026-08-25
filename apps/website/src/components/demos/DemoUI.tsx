import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import type { DemoPriority } from "@/content/demos";
import type { ProductId } from "@/theme/products";
import { DeviceMockup } from "../visual/DeviceMockup";
import { CTAButton } from "../conversion/CTAButton";
import { cycleTabKey, useTabFocus } from "../home/tabKeys";

const PRIORITY_CLASS: Record<DemoPriority, string> = {
  normal: "demo-priority demo-priority--normal",
  important: "demo-priority demo-priority--important",
  critical: "demo-priority demo-priority--critical",
  success: "demo-priority demo-priority--success",
};

export function DemoPriorityChip({ priority }: { priority: DemoPriority }) {
  return <span className={PRIORITY_CLASS[priority]}>{priority}</span>;
}

export function DemoNotice({
  title,
  body,
  priority,
  category,
  href,
  onOpen,
}: {
  title: string;
  body: string;
  priority: DemoPriority;
  category: string;
  href?: string;
  onOpen?: () => void;
}) {
  return (
    <div className="site-demo-pop rounded-xl border bg-card p-3 text-left">
      <div className="flex flex-wrap items-center gap-2">
        <DemoPriorityChip priority={priority} />
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {category}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold tracking-tight">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
      {href ? (
        <button
          type="button"
          className="mt-2 text-xs font-semibold text-foreground underline-offset-2 hover:underline"
          onClick={onOpen}
        >
          Open {href}
        </button>
      ) : null}
    </div>
  );
}

export function DemoPhone({
  product,
  title,
  children,
}: {
  product: ProductId;
  title: string;
  children: ReactNode;
}) {
  return (
    <DeviceMockup device="phone" title={title} demo className="w-full">
      <div data-product={product} className="p-3">
        {children}
      </div>
    </DeviceMockup>
  );
}

export function DemoScene({
  children,
  bridged = false,
}: {
  children: ReactNode;
  bridged?: boolean;
}) {
  return <div className={cn("demo-scene", bridged && "demo-scene--bridged")}>{children}</div>;
}

export function DemoStepper({
  steps,
  index,
  onIndex,
  onReset,
  playable = false,
  playing = false,
  onTogglePlay,
}: {
  steps: readonly { id: string; label: string }[];
  index: number;
  onIndex: (index: number) => void;
  onReset?: () => void;
  playable?: boolean;
  playing?: boolean;
  onTogglePlay?: () => void;
}) {
  const ids = steps.map((step) => step.id);
  const { setRef, focus } = useTabFocus<string>();
  const active = steps[index]?.id ?? steps[0]?.id ?? "";

  return (
    <div className="demo-stepper">
      <div
        className="demo-stepper__list"
        role="tablist"
        aria-label="Demo steps"
        onKeyDown={(event) => {
          cycleTabKey(
            event,
            ids,
            active,
            (id) => onIndex(Math.max(0, ids.indexOf(id))),
            focus,
          );
        }}
      >
        {steps.map((step, i) => (
          <button
            key={step.id}
            ref={setRef(step.id)}
            type="button"
            role="tab"
            aria-selected={i === index}
            tabIndex={i === index ? 0 : -1}
            className={cn("demo-step", i === index && "is-active", i < index && "is-done")}
            onClick={() => onIndex(i)}
          >
            <span className="demo-step__n">{i + 1}</span>
            {step.label}
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <CTAButton
          type="button"
          variant="secondary"
          size="md"
          disabled={index <= 0}
          onClick={() => onIndex(Math.max(0, index - 1))}
        >
          Back
        </CTAButton>
        <CTAButton
          type="button"
          size="md"
          disabled={index >= steps.length - 1}
          onClick={() => onIndex(Math.min(steps.length - 1, index + 1))}
        >
          Next
        </CTAButton>
        {playable ? (
          <CTAButton type="button" variant="secondary" size="md" onClick={onTogglePlay}>
            {playing ? "Pause" : "Play"}
          </CTAButton>
        ) : null}
        {onReset ? (
          <CTAButton type="button" variant="ghost" size="md" onClick={onReset}>
            Reset
          </CTAButton>
        ) : null}
      </div>
    </div>
  );
}
