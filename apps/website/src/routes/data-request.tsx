import { type FormEvent, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Input, Label, Textarea } from "@lumenx/ui";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { SiteCard } from "@/components/SiteCard";
import { CTAButton } from "@/components/conversion/CTAButton";
import { submitWebsiteLead } from "@/lib/leads";
import { PAGE_SEO, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/data-request")({
  head: () => pageHead(PAGE_SEO.dataRequest),
  component: DataRequestPage,
});

function DataRequestPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    if (!email.includes("@")) {
      setStatus("error");
      setMessage("Enter a valid email so we can reply.");
      return;
    }
    setStatus("sending");
    const result = await submitWebsiteLead({
      name: String(form.get("name") ?? "").trim(),
      institute: String(form.get("institute") ?? "").trim(),
      role: String(form.get("role") ?? "").trim(),
      email,
      phone: String(form.get("phone") ?? "").trim(),
      studentCount: "",
      message: String(form.get("message") ?? "").trim(),
      intent: "question",
    });
    if (result.ok) {
      setStatus("ok");
      setMessage("Thank you. We received your request and will follow up at the email you provided.");
    } else {
      setStatus("error");
      setMessage(result.message);
    }
  }

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Privacy"
        title="Data and account requests"
        lede="Use this page to ask about access, correction, or erasure of personal data. This website does not delete institute accounts or live campus records by itself."
        narrow
      >
        <div className="mb-8 space-y-4">
          <SiteCard quiet>
            <h2 className="text-base font-semibold tracking-tight">Account deletion vs data request</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Account deletion</strong> for Admin, Connect, Transport,
              Admissions, or Careers is handled by your institute office (or by LumenX support when the institute asks
              us). Closing a marketing form here does not remove a live login.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              <strong className="font-medium text-foreground">Data access, correction, or erasure</strong> requests for
              personal data held by LumenX are handled through our published privacy contacts. Prefer emailing{" "}
              <a className="underline underline-offset-2" href="mailto:official.lumenx@gmail.com">
                official.lumenx@gmail.com
              </a>{" "}
              with enough detail for us to identify the request. Also see our{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </SiteCard>
        </div>

        {status === "ok" ? (
          <p className="rounded-2xl border bg-card p-6 text-sm leading-relaxed" role="status">
            {message}
          </p>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit} noValidate autoComplete="on">
            <p className="text-sm text-muted-foreground">
              Optional form — if online delivery is not configured, we will tell you honestly and ask you to email us
              instead. Filling this form does not guarantee backend deletion.
            </p>
            <div>
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" autoComplete="name" required className="site-input mt-1.5" />
            </div>
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required className="site-input mt-1.5" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" autoComplete="tel" className="site-input mt-1.5" />
            </div>
            <div>
              <Label htmlFor="institute">Institute (if applicable)</Label>
              <Input id="institute" name="institute" autoComplete="organization" className="site-input mt-1.5" />
            </div>
            <div>
              <Label htmlFor="role">Your relationship to the data</Label>
              <Input
                id="role"
                name="role"
                placeholder="Parent, teacher, applicant, …"
                className="site-input mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="message">What are you requesting? *</Label>
              <Textarea
                id="message"
                name="message"
                required
                className="site-textarea mt-1.5"
                placeholder="Access, correction, erasure, or a question about account deletion…"
              />
            </div>
            {message && status === "error" ? (
              <p className="text-sm text-destructive" role="alert">
                {message}
              </p>
            ) : null}
            <CTAButton type="submit" disabled={status === "sending"}>
              {status === "sending" ? "Sending…" : "Submit request"}
            </CTAButton>
          </form>
        )}
      </Section>
    </SiteShell>
  );
}
