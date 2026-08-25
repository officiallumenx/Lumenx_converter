/**
 * LumenX product feedback — goes to LumenX, not the school.
 * Rating · Bug · Feature Request · Experience · optional screenshot.
 * Frontend only (localStorage via @lumenx/utils).
 */
import { useState, type ReactNode } from "react";
import { Check, MessageSquarePlus, Star } from "lucide-react";
import {
  LUMENX_FEEDBACK_KINDS,
  submitLumenXFeedback,
  type LumenXFeedbackKind,
  type LumenXFeedbackSource,
} from "@lumenx/utils";
import { cn } from "./lib/utils";
import { Button } from "./components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";
import { Label } from "./components/ui/label";
import { Textarea } from "./components/ui/textarea";
import { SimpleFileUpload, type SimpleUploadValue } from "./simple-file-upload";

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"] as const;

export type LumenXFeedbackFormProps = {
  source: LumenXFeedbackSource;
  /** Compact layout for dialogs */
  compact?: boolean;
  className?: string;
  onSubmitted?: () => void;
};

export function LumenXFeedbackForm({
  source,
  compact,
  className,
  onSubmitted,
}: LumenXFeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [kind, setKind] = useState<LumenXFeedbackKind>("experience");
  const [message, setMessage] = useState("");
  const [screenshot, setScreenshot] = useState<SimpleUploadValue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reset = () => {
    setRating(0);
    setKind("experience");
    setMessage("");
    setScreenshot(null);
    setError(null);
    setSubmitted(false);
  };

  const submit = () => {
    setError(null);
    if (rating < 1) {
      setError("Please rate your experience (1–5 stars).");
      return;
    }
    if (message.trim().length < 12) {
      setError("Please write at least 12 characters.");
      return;
    }
    submitLumenXFeedback({
      source,
      kind,
      rating,
      message,
      screenshotFileName: screenshot?.fileName ?? null,
      screenshotDataUrl: screenshot?.dataUrl ?? null,
    });
    setSubmitted(true);
    onSubmitted?.();
  };

  if (submitted) {
    return (
      <div className={cn("px-1 py-8 text-center", className)}>
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/15">
          <Check className="size-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
        </div>
        <h3 className="text-base font-semibold">Thank you for your feedback</h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Sent to the LumenX product team — not your school. Frontend demo only; nothing was emailed
          or posted to a server.
        </p>
        <Button type="button" className="mt-6 rounded-xl" onClick={reset}>
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-5", className)}>
      <p className="text-sm text-muted-foreground">
        Feedback goes to <span className="font-medium text-foreground">LumenX</span>, not your
        school. Use school complaints for institute-specific issues.
      </p>

      <div>
        <Label className="text-xs text-muted-foreground">Rating</Label>
        <div className="mt-2">
          <StarRating value={rating} onChange={setRating} />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {rating === 0 ? "Tap to rate" : RATING_LABELS[rating]}
        </p>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Type</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {LUMENX_FEEDBACK_KINDS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setKind(item.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs transition-colors",
                kind === item.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted/50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground" htmlFor="lumenx-feedback-message">
          Your message
        </Label>
        <Textarea
          id="lumenx-feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
          placeholder={
            kind === "bug"
              ? "What went wrong? Steps to reproduce…"
              : kind === "feature"
                ? "What should we add or improve?"
                : "Tell us about your experience with LumenX…"
          }
          rows={compact ? 4 : 5}
          className="mt-1.5 rounded-xl"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">{message.length} / 1000</p>
      </div>

      <SimpleFileUpload
        kind="image"
        label="Screenshot (optional)"
        value={screenshot}
        onChange={setScreenshot}
      />

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Button type="button" className="w-full rounded-xl sm:w-auto" onClick={submit}>
        Submit to LumenX
      </Button>
    </div>
  );
}

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="rounded-md p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn(
              "size-6 transition-colors",
              n <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40",
            )}
            aria-hidden
          />
        </button>
      ))}
    </div>
  );
}

export function LumenXFeedbackDialog({
  open,
  onOpenChange,
  source,
  title = "LumenX Feedback",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: LumenXFeedbackSource;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="size-5 text-primary" aria-hidden />
            {title}
          </DialogTitle>
        </DialogHeader>
        <LumenXFeedbackForm
          source={source}
          compact
          onSubmitted={() => {
            /* keep dialog open to show thank-you; user closes manually */
          }}
        />
        <DialogFooter>
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Alias for embedded panels (e.g. Admin settings tab). */
export function LumenXFeedbackPanel(props: LumenXFeedbackFormProps & { header?: ReactNode }) {
  return (
    <div className="space-y-3">
      {props.header}
      <LumenXFeedbackForm {...props} />
    </div>
  );
}
