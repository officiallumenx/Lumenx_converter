import { useId, useState } from "react";
import { BookOpen, ChevronDown, CircleHelp, FileText, MessageSquarePlus, Scale, Shield } from "lucide-react";
import { cn, LumenXFeedbackDialog } from "@lumenx/ui";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManagerCallCard } from "@/components/ui/manager-call-card";
import { SectionHeader } from "@/components/ui/section-header";
import { supportRepository } from "@/lib/transport";
import { MODULE_COLORS } from "@/theme/colors";

function LegalDocumentSheet({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  iconColor,
  body,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: typeof FileText;
  iconColor: { primary: string; iconBackground: string };
  body: string;
}) {
  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <Button type="button" variant="outline" expanded onClick={() => onOpenChange(false)}>
          Close
        </Button>
      }
    >
      <div className="rounded-2xl border border-border bg-muted/30 p-4">
        <span
          className="mb-3 flex size-10 items-center justify-center rounded-xl"
          style={{ color: iconColor.primary, backgroundColor: iconColor.iconBackground }}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="text-sm leading-relaxed text-foreground">{body}</p>
      </div>
    </BottomSheet>
  );
}

export function SupportPage() {
  const support = supportRepository.getSnapshot();
  const faqBaseId = useId();
  const [openFaqId, setOpenFaqId] = useState<string | null>(support.faqs[0]?.id ?? null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <ManagerCallCard
        name={support.manager.name}
        phone={support.manager.phone}
        label="Manager number"
      />

      <Card className="overflow-hidden border-transport/20 bg-gradient-to-br from-transport/[0.06] via-card to-primary/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus
              className="size-4"
              style={{ color: MODULE_COLORS.transport.primary }}
              aria-hidden
            />
            Send app feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Optional. For school help, call your manager above.
          </p>
          <Button type="button" variant="outline" onClick={() => setFeedbackOpen(true)}>
            <MessageSquarePlus className="size-4" aria-hidden />
            Open feedback
          </Button>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-transport/20 bg-gradient-to-br from-transport/[0.06] via-card to-primary/[0.04]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleHelp
              className="size-4"
              style={{ color: MODULE_COLORS.transport.primary }}
              aria-hidden
            />
            Help Center
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {support.helpCenter.summary}
          </p>
          <ul className="space-y-2">
            {support.helpCenter.topics.map((topic) => (
              <li
                key={topic}
                className="flex items-start gap-2 rounded-xl border border-border/80 bg-card/80 px-3 py-2.5 text-sm text-foreground"
              >
                <BookOpen
                  className="mt-0.5 size-4 shrink-0"
                  style={{ color: MODULE_COLORS.primary.primary }}
                  aria-hidden
                />
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <SectionHeader title="FAQ" subtitle="Common driver questions" />
        <div className="space-y-2.5">
          {support.faqs.map((faq) => {
            const open = openFaqId === faq.id;
            const panelId = `${faqBaseId}-${faq.id}-panel`;
            const buttonId = `${faqBaseId}-${faq.id}-button`;

            return (
              <Card key={faq.id} className={cn(open && "border-primary/25")}>
                <button
                  id={buttonId}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenFaqId(open ? null : faq.id)}
                >
                  <p className="min-w-0 flex-1 font-display text-sm font-semibold tracking-tight text-foreground sm:text-base">
                    {faq.question}
                  </p>
                  <ChevronDown
                    className={cn(
                      "size-5 shrink-0 text-muted-foreground transition-transform duration-200",
                      open && "rotate-180 text-primary",
                    )}
                    aria-hidden
                  />
                </button>
                {open ? (
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="border-t border-border/70 px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:pb-5"
                  >
                    {faq.answer}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setPrivacyOpen(true)}
          className="transport-pressable rounded-2xl border border-border bg-card p-4 text-left shadow-soft hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
        >
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{
              color: MODULE_COLORS.success.primary,
              backgroundColor: MODULE_COLORS.success.iconBackground,
            }}
          >
            <Shield className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-display text-sm font-semibold tracking-tight text-foreground">
            Privacy Policy
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            How demo data stays on device
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="transport-pressable rounded-2xl border border-border bg-card p-4 text-left shadow-soft hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-5"
        >
          <span
            className="flex size-10 items-center justify-center rounded-xl"
            style={{
              color: MODULE_COLORS.primary.primary,
              backgroundColor: MODULE_COLORS.primary.iconBackground,
            }}
          >
            <Scale className="size-5" aria-hidden />
          </span>
          <p className="mt-3 font-display text-sm font-semibold tracking-tight text-foreground">
            Terms
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Product terms</p>
        </button>
      </section>

      <LegalDocumentSheet
        open={privacyOpen}
        onOpenChange={setPrivacyOpen}
        title="Privacy Policy"
        description="LumenX Transport privacy & cookie policy."
        icon={FileText}
        iconColor={MODULE_COLORS.success}
        body={support.privacyPolicy}
      />

      <LegalDocumentSheet
        open={termsOpen}
        onOpenChange={setTermsOpen}
        title="Terms"
        description="LumenX Transport terms & conditions."
        icon={Scale}
        iconColor={MODULE_COLORS.primary}
        body={support.terms}
      />

      <LumenXFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        source="transport"
      />
    </div>
  );
}
