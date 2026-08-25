import { useState } from "react";
import type { DemoPriority } from "@/content/demos";
import { DEMO_STUDENT } from "@/content/demos";
import { CTAButton } from "../conversion/CTAButton";
import { DemoNotice, DemoPhone, DemoPriorityChip, DemoScene } from "./DemoUI";

type Item = {
  id: string;
  event: string;
  title: string;
  body: string;
  priority: DemoPriority;
  category: string;
  href: string;
};

const CATALOG: Omit<Item, "id">[] = [
  {
    event: "Event published",
    title: "Sports day",
    body: "Sat 12 Sep · Main ground · Morning assembly then heats.",
    priority: "normal",
    category: "events",
    href: "/events",
  },
  {
    event: "Absence recorded",
    title: `Absence recorded · ${DEMO_STUDENT.name}`,
    body: `${DEMO_STUDENT.name} was marked absent (Morning) today for class 8-A.`,
    priority: "important",
    category: "attendance",
    href: "/attendance",
  },
  {
    event: "Emergency note",
    title: "Emergency on your bus",
    body: `${DEMO_STUDENT.bus} · ${DEMO_STUDENT.route}: delay at Silk Board. Open Transport for status.`,
    priority: "critical",
    category: "emergency",
    href: "/transport",
  },
  {
    event: "Homework submitted",
    title: "Homework submitted",
    body: `${DEMO_STUDENT.name} submitted Maths worksheet.`,
    priority: "success",
    category: "assignments",
    href: "/homework",
  },
];

export function NotificationsDemo() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState<Item | null>(null);

  function fire(sample: Omit<Item, "id">) {
    const next = { ...sample, id: `${sample.priority}-${Date.now()}` };
    setItems((prev) => [next, ...prev].slice(0, 6));
    setOpen(next);
  }

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Each notice has a category, a priority (normal, important, critical, success), and a deep link into Connect. The
        link stays inside this demonstration — it is not a login.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        {CATALOG.map((sample) => (
          <CTAButton key={sample.priority} type="button" variant="secondary" size="md" onClick={() => fire(sample)}>
            {sample.event}
          </CTAButton>
        ))}
      </div>
      <DemoScene bridged>
        <DemoPhone product="connect" title="Inbox · Connect">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Fire an event to see a notice.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <DemoNotice
                    title={item.title}
                    body={item.body}
                    priority={item.priority}
                    category={item.category}
                    href={item.href}
                    onOpen={() => setOpen(item)}
                  />
                </li>
              ))}
            </ul>
          )}
        </DemoPhone>
        <DemoPhone product="connect" title="Deep link">
          {open ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Would open</p>
              <p className="mt-2 font-mono text-sm">{open.href}</p>
              <p className="mt-3 text-sm font-medium">{open.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Category {open.category} · <DemoPriorityChip priority={open.priority} />
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                In the real app this route is inside Connect for the signed-in role. This page never logs you in.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a notice to see its deep link.</p>
          )}
        </DemoPhone>
      </DemoScene>
    </div>
  );
}
