import type { ReactNode } from "react";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@lumenx/ui";

export function FAQItem({
  question,
  children,
  value,
}: {
  question: string;
  children: ReactNode;
  value: string;
}) {
  return (
    <AccordionItem value={value} className="border-border px-1">
      <AccordionTrigger className="text-base font-semibold text-foreground hover:no-underline">
        {question}
      </AccordionTrigger>
      <AccordionContent className="text-muted-foreground leading-relaxed">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
