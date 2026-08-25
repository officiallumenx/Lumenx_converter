import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  LumenXFeedbackDialog,
} from "@lumenx/ui";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { HELP_TOPICS, SUPPORT_EMAIL, TEACHER_FAQS } from "./support-content";

export function FaqDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Frequently asked questions</DialogTitle>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          {TEACHER_FAQS.map((item, i) => (
            <AccordionItem key={item.q} value={`faq-${i}`}>
              <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}

export function HelpCenterDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Help center</DialogTitle>
        </DialogHeader>
        <Accordion type="single" collapsible className="w-full">
          {HELP_TOPICS.map((topic, i) => (
            <AccordionItem key={topic.title} value={`help-${i}`}>
              <AccordionTrigger className="text-left text-sm font-medium">
                {topic.title}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                {topic.body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}

export function ContactSupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("LumenX Connect — Teacher Support")}`;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      toast.success("Email copied to clipboard");
    } catch {
      toast.info(SUPPORT_EMAIL);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Reach the LumenX team for account, portal, or technical help. We typically respond within
          1–2 business days.
        </p>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground">Support email</p>
          <p className="mt-1 font-medium break-all">{SUPPORT_EMAIL}</p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="rounded-xl gap-2" onClick={copyEmail}>
            <Copy className="size-4" /> Copy email
          </Button>
          <Button asChild className="rounded-xl gap-2">
            <a href={mailto}>
              <Mail className="size-4" /> Send email
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return <LumenXFeedbackDialog open={open} onOpenChange={onOpenChange} source="connect" />;
}

export function ReportIssueDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const submit = () => {
    if (subject.trim().length < 4 || details.trim().length < 12) {
      toast.error("Add a short title and describe the issue (12+ characters)");
      return;
    }
    const body = encodeURIComponent(`Issue: ${subject.trim()}\n\n${details.trim()}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`[Issue] ${subject.trim()}`)}&body=${body}`;
    toast.success("Opening your email app to report the issue");
    setSubject("");
    setDetails("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report an issue</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Brief title (e.g. Attendance not saving)"
            className="rounded-xl"
          />
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Steps to reproduce, class, and what you expected…"
            rows={4}
            className="rounded-xl"
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Report via email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
