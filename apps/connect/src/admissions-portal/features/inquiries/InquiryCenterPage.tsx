import { useState } from "react";
import { Button, Input, Label, Textarea } from "@lumenx/ui";
import { Badge } from "@lumenx/ui";
import { toast } from "sonner";
import { AdmissionsPageHeader } from "@/admissions-portal/shared/ui/AdmissionsPageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { EmptyState } from "@/admissions-portal/shared/ui/PageSkeleton";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { createInquiry, getInquiriesForUser } from "@/lib/admissions/inquiries-store";
import type { InquiryCategory } from "@/lib/admissions/types";

const CATEGORIES: { value: InquiryCategory; label: string }[] = [
  { value: "admission", label: "Admission" },
  { value: "program", label: "Program" },
  { value: "fees", label: "Fees" },
  { value: "transport", label: "Transport" },
  { value: "hostel", label: "Hostel" },
  { value: "general", label: "General" },
];

export function InquiryCenterPage() {
  const { user } = useAdmissionsAuth();
  const [items, setItems] = useState(user ? getInquiriesForUser(user.id) : []);
  const [category, setCategory] = useState<InquiryCategory>("admission");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!user || !subject.trim() || !message.trim()) {
      toast.error("Please fill subject and message");
      return;
    }
    const created = createInquiry({
      applicantId: user.id,
      category,
      subject: subject.trim(),
      message: message.trim(),
    });
    setItems(getInquiriesForUser(user.id));
    setSubject("");
    setMessage("");
    toast.success(`Inquiry ${created.id} submitted`);
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <AdmissionsPageHeader
        title="Inquiry center"
        subtitle="Ask admission, program, fee, transport, or hostel questions"
      />

      <SectionCard title="New inquiry">
        <div className="space-y-4 max-w-xl">
          <div>
            <Label className="text-xs">Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InquiryCategory)}
              className="mt-1 w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief subject"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your question…"
              className="mt-1 min-h-[100px]"
            />
          </div>
          <Button onClick={submit}>Submit inquiry</Button>
        </div>
      </SectionCard>

      <SectionCard title="Inquiry history">
        {items.length === 0 ? (
          <EmptyState
            title="No inquiries yet"
            hint="Your questions and responses will appear here."
          />
        ) : (
          <div className="space-y-3">
            {items.map((inq) => (
              <div key={inq.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{inq.id}</p>
                    <p className="font-medium text-sm">{inq.subject}</p>
                  </div>
                  <Badge
                    variant={
                      inq.status === "answered"
                        ? "default"
                        : inq.status === "closed"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {inq.status}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{inq.message}</p>
                {inq.responses.map((r) => (
                  <div
                    key={r.id}
                    className="mt-3 rounded-lg bg-primary/5 border border-primary/15 p-3 text-sm"
                  >
                    <p className="font-medium text-xs text-primary">{r.from}</p>
                    <p className="mt-1">{r.body}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(r.at).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
