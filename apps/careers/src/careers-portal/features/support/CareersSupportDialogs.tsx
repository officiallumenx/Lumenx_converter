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
  Textarea,
  LumenXFeedbackDialog,
} from "@lumenx/ui";
import { Copy, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  CAREERS_CONTACT,
  CAREERS_HELP_TOPICS,
  CAREERS_SETTINGS_FAQS,
} from "@/careers-portal/features/support/careers-support-content";

export function CareersFaqDialog({
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
          {CAREERS_SETTINGS_FAQS.map((item, i) => (
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

export function CareersHelpCenterDialog({
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
          {CAREERS_HELP_TOPICS.map((topic, i) => (
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

export function CareersContactSupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const mailto = `mailto:${CAREERS_CONTACT.email}?subject=${encodeURIComponent("LumenX Careers — Support")}`;

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.info(value);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Reach the Careers team for portal help, application questions, or account issues. We
          typically respond within 1–2 business days.
        </p>
        <div className="space-y-3">
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Phone className="size-3.5" /> Support mobile
            </p>
            <p className="mt-1 font-medium">{CAREERS_CONTACT.phone}</p>
            <p className="text-xs text-muted-foreground mt-1">{CAREERS_CONTACT.officeHours}</p>
          </div>
          <div className="rounded-xl border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="size-3.5" /> Support email
            </p>
            <p className="mt-1 font-medium break-all">{CAREERS_CONTACT.email}</p>
          </div>
          <p className="text-xs text-muted-foreground">{CAREERS_CONTACT.address}</p>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => void copy(CAREERS_CONTACT.phone, "Phone number")}
          >
            <Copy className="size-4" /> Copy phone
          </Button>
          <Button
            variant="outline"
            className="rounded-xl gap-2"
            onClick={() => void copy(CAREERS_CONTACT.email, "Email")}
          >
            <Copy className="size-4" /> Copy email
          </Button>
          <Button asChild className="rounded-xl gap-2">
            <a href={`tel:${CAREERS_CONTACT.phone.replace(/\s/g, "")}`}>
              <Phone className="size-4" /> Call
            </a>
          </Button>
          <Button asChild className="rounded-xl gap-2">
            <a href={mailto}>
              <Mail className="size-4" /> Email
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CareersFeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return <LumenXFeedbackDialog open={open} onOpenChange={onOpenChange} source="careers" />;
}

export function CareersReportIssueDialog({
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
    window.location.href = `mailto:${CAREERS_CONTACT.email}?subject=${encodeURIComponent(`[Careers Issue] ${subject.trim()}`)}&body=${body}`;
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
            placeholder="Brief title (e.g. Application not loading)"
            className="rounded-xl"
          />
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="What happened, which page, and what you expected…"
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
