import type { ReactNode } from "react";
import { Accordion, cn } from "@lumenx/ui";
import { FAQItem } from "./FAQItem";

export function FAQList({
  items,
  defaultOpenFirst = false,
  className,
}: {
  items: ReadonlyArray<{ q: string; a: ReactNode }>;
  defaultOpenFirst?: boolean;
  className?: string;
}) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenFirst && items[0] ? items[0].q : undefined}
      className={cn("w-full rounded-xl border border-border bg-card px-4 shadow-sm", className)}
    >
      {items.map((item) => (
        <FAQItem key={item.q} value={item.q} question={item.q}>
          {item.a}
        </FAQItem>
      ))}
    </Accordion>
  );
}
