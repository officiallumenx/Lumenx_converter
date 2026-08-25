import { useState, type ReactNode } from "react";

export function FAQItem({
  question,
  children,
  defaultOpen = false,
}: {
  question: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="site-faq"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{question}</summary>
      <div className="site-faq__body">{children}</div>
    </details>
  );
}
