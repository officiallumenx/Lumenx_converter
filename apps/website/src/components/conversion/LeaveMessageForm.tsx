import { type FormEvent, useState } from "react";
import { Input, Label, Textarea } from "@lumenx/ui";
import { CTAButton } from "./CTAButton";
import { submitWebsiteLead } from "@/lib/leads";
import { cn } from "@lumenx/ui";

export function LeaveMessageForm({
  className,
  submitLabel = "Send message",
}: {
  className?: string;
  submitLabel?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const phone = String(form.get("phone") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();

    if (!name) {
      setError("Please enter your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email so we can reply.");
      return;
    }
    if (!phone) {
      setError("Please enter your phone number.");
      return;
    }
    if (!message) {
      setError("Please write your question or message.");
      return;
    }

    setStatus("sending");
    const result = await submitWebsiteLead({
      name,
      institute: "",
      role: "",
      email,
      phone,
      studentCount: "",
      message,
      intent: "question",
    });

    if (result.ok) {
      setStatus("ok");
      setFeedback("Thank you. We received your message and will get back to you at the email you shared.");
    } else {
      setStatus("error");
      setFeedback(result.message);
    }
  }

  if (status === "ok") {
    return (
      <p className={cn("rounded-2xl border bg-card p-6 text-sm leading-relaxed", className)} role="status">
        {feedback}
      </p>
    );
  }

  return (
    <form className={cn("space-y-4", className)} onSubmit={onSubmit} noValidate autoComplete="on">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="leave-name">Name *</Label>
          <Input
            id="leave-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            aria-required
            className="site-input mt-1.5"
            placeholder="Your full name"
          />
        </div>
        <div>
          <Label htmlFor="leave-phone">Phone *</Label>
          <Input
            id="leave-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            required
            aria-required
            className="site-input mt-1.5"
            placeholder="Mobile number"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="leave-email">Email *</Label>
        <Input
          id="leave-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-required
          aria-invalid={Boolean(error?.toLowerCase().includes("email")) || undefined}
          aria-describedby={error ? "leave-message-error" : undefined}
          className="site-input mt-1.5"
          placeholder="you@institute.edu"
        />
      </div>
      <div>
        <Label htmlFor="leave-message">Your question or message *</Label>
        <Textarea
          id="leave-message"
          name="message"
          required
          aria-required
          className="site-textarea mt-1.5"
          placeholder="Ask anything about LumenX — products, pricing, trial, Transport, Admissions, Careers…"
        />
      </div>
      {error ? (
        <p id="leave-message-error" className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {feedback && status === "error" ? (
        <p className="text-sm text-destructive" role="alert">
          {feedback}
        </p>
      ) : null}
      <CTAButton type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : submitLabel}
      </CTAButton>
    </form>
  );
}
