import { type FormEvent, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input, Label } from "@lumenx/ui";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { ConversionNav } from "@/components/conversion/ConversionNav";
import { CTAButton } from "@/components/conversion/CTAButton";
import { SiteCard } from "@/components/SiteCard";
import { submitWebsiteLead } from "@/lib/leads";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { contactSearch } from "@/lib/search";
import { cn } from "@lumenx/ui";

const INTERESTS = [
  { id: "full", label: "Full platform" },
  { id: "admin", label: "Admin" },
  { id: "connect", label: "Connect" },
  { id: "transport", label: "Transport" },
  { id: "admissions", label: "Admissions" },
  { id: "careers", label: "Careers" },
] as const;

export const Route = createFileRoute("/get-started")({
  head: () => pageHead(PAGE_SEO.getStarted),
  component: GetStartedPage,
});

function GetStartedPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(["full"]);

  function toggleInterest(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return [...prev, id];
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email.includes("@")) {
      setStatus("error");
      setFeedback("Enter a valid email so we can reach you.");
      return;
    }
    if (selected.length === 0) {
      setStatus("error");
      setFeedback("Select at least one interest.");
      return;
    }
    setStatus("sending");
    const instituteType = String(form.get("instituteType") ?? "").trim();
    const students = String(form.get("students") ?? "").trim();
    const staff = String(form.get("staff") ?? "").trim();
    const result = await submitWebsiteLead({
      name: String(form.get("name") ?? "").trim() || "Institute contact",
      institute: String(form.get("institute") ?? "").trim(),
      role: instituteType,
      email,
      phone: String(form.get("phone") ?? "").trim(),
      studentCount: students,
      message: [
        "Get started request",
        instituteType ? `Institution type: ${instituteType}` : null,
        staff ? `Approximate staff: ${staff}` : null,
        `Interested in: ${selected.join(", ")}`,
        String(form.get("notes") ?? "").trim() || null,
      ]
        .filter(Boolean)
        .join("\n"),
      intent: "trial",
    });
    if (result.ok) {
      setStatus("ok");
      setFeedback("Thank you. We’ll follow up at the email you provided.");
    } else {
      setStatus("error");
      setFeedback(result.message);
    }
  }

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Get started"
        title="Start with LumenX"
        lede="Tell us about the institute. A 60-day trial begins after approval. This site does not take payment or create a live account by itself."
      >
        <ConversionNav active="/get-started" />

        {status === "ok" ? (
          <SiteCard quiet>
            <p className="text-sm leading-relaxed" role="status">
              {feedback}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <CTAButton asChild variant="secondary">
                <Link to="/contact" search={contactSearch("demo")}>
                  Book a Demo
                </Link>
              </CTAButton>
              <CTAButton asChild variant="ghost">
                <Link to="/platform">Explore Platform</Link>
              </CTAButton>
            </div>
          </SiteCard>
        ) : (
          <form className="mx-auto max-w-2xl space-y-5" onSubmit={onSubmit} noValidate>
            <Field id="institute" label="Institution name" required autoComplete="organization" />
            <Field
              id="instituteType"
              label="Institution type"
              placeholder="School, college, coaching, trust…"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="students" label="Number of students" inputMode="numeric" />
              <Field id="staff" label="Number of staff" inputMode="numeric" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="phone" label="Phone" type="tel" required autoComplete="tel" />
              <Field id="email" label="Email" type="email" required autoComplete="email" />
            </div>
            <Field id="name" label="Your name" autoComplete="name" />

            <fieldset>
              <legend className="text-sm font-medium">Interested in</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {INTERESTS.map((item) => {
                  const on = selected.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={on}
                      className={cn("site-product-nav__item", on && "is-active")}
                      onClick={() => toggleInterest(item.id)}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="notes">Anything else?</Label>
              <Input id="notes" name="notes" className="site-input mt-1.5" placeholder="Optional notes" />
            </div>

            {feedback ? (
              <p
                className={cn(
                  "rounded-2xl border p-4 text-sm leading-relaxed",
                  status === "error" ? "border-destructive/40 text-destructive" : "bg-card",
                )}
                role={status === "error" ? "alert" : "status"}
              >
                {feedback}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <CTAButton type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Continue"}
              </CTAButton>
              <CTAButton asChild variant="secondary">
                <Link to="/contact" search={contactSearch("demo")}>
                  Book a Demo instead
                </Link>
              </CTAButton>
            </div>
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
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: "numeric";
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
        placeholder={placeholder}
        inputMode={inputMode}
        className="site-input mt-1.5"
      />
    </div>
  );
}
