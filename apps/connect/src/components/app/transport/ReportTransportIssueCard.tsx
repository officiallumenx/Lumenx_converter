import { useState } from "react";
import { Button, Textarea } from "@lumenx/ui";
import { toast } from "sonner";
import { submitLearnerComplaint } from "@/lib/complaints";

type Props = {
  instituteId: string;
  studentId: string;
  studentName?: string | null;
};

export function ReportTransportIssueCard({
  instituteId,
  studentId,
  studentName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmed = body.trim();
    if (trimmed.length < 8) {
      toast.message("Add a short description of the issue");
      return;
    }
    setBusy(true);
    try {
      await submitLearnerComplaint({
        instituteId,
        studentId,
        title: studentName
          ? `Transport issue · ${studentName}`
          : "Transport issue",
        body: trimmed,
        category: "Transport",
        destination: "principal_admin",
        priority: "High",
      });
      toast.success("Transport issue reported", {
        description: "School admin will review this report.",
      });
      setBody("");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
      <p className="text-sm font-medium text-foreground">Report a transport issue</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use this only for real bus, driver, pickup, or drop problems. Assignment stays unchanged.
      </p>
      {!open ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-3"
          onClick={() => setOpen(true)}
        >
          Report transport issue
        </Button>
      ) : (
        <div className="mt-3 space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe what happened (bus late, missed stop, unsafe driving…)"
            rows={4}
            disabled={busy}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void submit()}>
              {busy ? "Sending…" : "Submit report"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setBody("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
