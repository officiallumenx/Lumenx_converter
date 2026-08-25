import { useState } from "react";
import { DEMO_STUDENT } from "@/content/demos";
import type { DemoPriority } from "@/content/demos";
import { DemoNotice, DemoPhone, DemoScene, DemoStepper } from "./DemoUI";

type Step = {
  id: string;
  label: string;
  admin: string;
  title: string;
  body: string;
  priority: DemoPriority;
  balance: string;
};

const STEPS: Step[] = [
  {
    id: "added",
    label: "Added",
    admin: "Term 2 tuition published for Grade 8",
    title: "Fee added",
    body: `Term 2 tuition (₹12,400) has been added for ${DEMO_STUDENT.name}.`,
    priority: "normal",
    balance: "₹12,400",
  },
  {
    id: "due",
    label: "Due",
    admin: "Due date 12 Sep · visible to the family",
    title: "Fee due",
    body: `Term 2 tuition of ₹12,400 is due by 12 Sep.`,
    priority: "important",
    balance: "₹12,400",
  },
  {
    id: "reminder",
    label: "Reminder",
    admin: "Reminder queued from Admin fees",
    title: "Fee reminder",
    body: `Term 2 tuition of ₹12,400 is due by 12 Sep.`,
    priority: "important",
    balance: "₹12,400",
  },
  {
    id: "overdue",
    label: "Overdue",
    admin: "Past due · still no public checkout here",
    title: "Fee overdue",
    body: `Term 2 tuition of ₹12,400 was due 12 Sep and is overdue.`,
    priority: "critical",
    balance: "₹12,400",
  },
];

export function FeesDemo() {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Structure lives in Admin. Dues show in Connect. This demonstration does not collect payment and does not open a
        gateway.
      </p>
      <DemoStepper steps={STEPS} index={index} onIndex={setIndex} onReset={() => setIndex(0)} />
      <div className="mt-6">
        <DemoScene bridged>
          <DemoPhone product="admin" title="Office · Admin">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Fees</p>
            <p className="mt-2 text-sm font-medium">Term 2 tuition · Grade 8</p>
            <p className="mt-3 font-mono text-2xl font-semibold tabular-nums">{step.balance}</p>
            <p className="mt-2 text-sm text-muted-foreground">{step.admin}</p>
          </DemoPhone>
          <DemoPhone product="connect" title="Parent · Connect">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{step.balance}</p>
            <p className="mt-1 text-xs text-muted-foreground">{DEMO_STUDENT.name} · due 12 Sep</p>
            <div className="mt-3">
              <DemoNotice
                key={step.id}
                title={step.title}
                body={step.body}
                priority={step.priority}
                category="fees"
                href="/fees"
              />
            </div>
          </DemoPhone>
        </DemoScene>
      </div>
    </div>
  );
}
