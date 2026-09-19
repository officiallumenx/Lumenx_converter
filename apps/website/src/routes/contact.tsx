import { type FormEvent, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input, Label, Textarea } from "@lumenx/ui";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { CTAButton } from "@/components/conversion/CTAButton";
import { LeaveMessageForm } from "@/components/conversion/LeaveMessageForm";
import { submitWebsiteLead, type WebsiteLeadIntent } from "@/lib/leads";
import { contactSearch, parseContactSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { cn } from "@lumenx/ui";

const INTENT_COPY: Record<WebsiteLeadIntent, { title: string; lede: string }> = {
  question: {
    title: "Leave a message",
    lede: "Ask anything about the LumenX platform. Share your name, email, phone, and message — we’ll reply when delivery is configured.",
  },
  demo: {
    title: "Book a demo",
    lede: "Tell us about the institute and what you want to see. We’ll follow up to schedule a walkthrough — this page does not open a live tenant.",
  },
  trial: {
    title: "Start a 60-day trial",
    lede: "Tell us about the institute. We’ll follow up to complete verification — no payment on this page.",
  },
  quote: {
    title: "Request a quote",
    lede: "Share your student count and we’ll confirm a clear campus quote. The Pricing page shows an estimate.",
  },
  partner: {
    title: "Partnership",
    lede: "Groups, trusts, and implementation partners — introduce the organisation and we’ll route it.",
  },
};

const INTENT_TABS: { intent: WebsiteLeadIntent; label: string }[] = [
  { intent: "question", label: "Leave a message" },
  { intent: "demo", label: "Book a demo" },
  { intent: "trial", label: "Start trial" },
  { intent: "quote", label: "Request quote" },
  { intent: "partner", label: "Partnership" },
];

export const Route = createFileRoute("/contact")({
  validateSearch: parseContactSearch,
  head: () => pageHead(PAGE_SEO.contact),
  component: ContactPage,
});

function ContactPage() {
  const search = Route.useSearch();
  const intent = search.intent;
  const copy = INTENT_COPY[intent];
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const defaultMessage = useMemo(() => {
    if (intent === "quote" && search.students) {
      return `Please quote for about ${search.students} students.`;
    }
    if (intent === "demo") {
      return "We would like a product demo for our institute.";
    }
    return "";
  }, [intent, search.students]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email.includes("@")) {
      setError("Enter a valid email so we can reach you.");
      return;
    }
    setStatus("sending");
    const result = await submitWebsiteLead({
      name: String(form.get("name") ?? "").trim(),
      institute: String(form.get("institute") ?? "").trim(),
      role: String(form.get("role") ?? "").trim(),
      email,
      phone: String(form.get("phone") ?? "").trim(),
      studentCount: String(form.get("studentCount") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
      intent,
    });
    if (result.ok) {
      setStatus("ok");
      setFeedback("Thank you. We’ll reach you at the email you provided.");
    } else {
      setStatus("error");
      setFeedback(result.message);
    }
  }

  return (
    <SiteShell>
      <Section eyebrow="Contact" title={copy.title} lede={copy.lede} narrow headingAs="h1">
        <nav className="home-role-tabs mb-8" aria-label="Contact options">
          {INTENT_TABS.map((tab) => (
            <Link
              key={tab.intent}
              to="/contact"
              search={contactSearch(tab.intent, search.students)}
              className={cn("site-product-nav__item")}
              aria-current={intent === tab.intent ? "page" : undefined}
              onClick={() => {
                setStatus("idle");
                setFeedback(null);
                setError(null);
              }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>

        {intent === "question" ? (
          <LeaveMessageForm />
        ) : status === "ok" ? (
          <p className="rounded-2xl border bg-card p-6 text-sm leading-relaxed" role="status">
            {feedback}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit} noValidate autoComplete="on">
            <Field id="name" label="Your name" autoComplete="name" required />
            <Field id="institute" label="Institute name" autoComplete="organization" required />
            <Field id="role" label="Your role" placeholder="Principal, trustee, …" />
            <Field
              id="email"
              label="Email"
              type="email"
              autoComplete="email"
              required
              invalid={Boolean(error)}
              describedBy={error ? "contact-error" : undefined}
            />
            <Field id="phone" label="Phone" type="tel" autoComplete="tel" required />
            <Field
              id="studentCount"
              label="Approximate student count"
              inputMode="numeric"
              autoComplete="off"
              defaultValue={search.students ? String(search.students) : ""}
            />
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" className="site-textarea mt-1.5" defaultValue={defaultMessage} />
            </div>
            {error ? (
              <p id="contact-error" className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            {feedback && status === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {feedback}
              </p>
            ) : null}
            <CTAButton type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Send"}
            </CTAButton>
          </form>
        )}
      </Section>
    </SiteShell>
  );
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  required,
  placeholder,
  inputMode,
  defaultValue,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric";
  defaultValue?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        inputMode={inputMode}
        defaultValue={defaultValue}
        className="site-input mt-1.5"
      />
    </div>
  );
}
