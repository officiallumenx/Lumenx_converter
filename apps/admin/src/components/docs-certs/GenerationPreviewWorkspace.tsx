import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Pill,
} from "@lumenx/ui-admin";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export type PreviewPublishStatus =
  | "pending"
  | "publishing"
  | "published"
  | "failed";

export type PreviewItem = {
  id: string;
  studentName: string;
  subtitle?: string | null;
  documentNumber?: string | null;
  publishStatus: PreviewPublishStatus;
  errorMessage?: string | null;
};

type GenerationPreviewWorkspaceProps = {
  items: PreviewItem[];
  index: number;
  onIndexChange: (index: number) => void;
  preview: ReactNode;
  onPublishCurrent: () => void;
  onPublishAll: () => void;
  onRetryFailed: () => void;
  onCancel: () => void;
  publishLabel: string;
  busy?: boolean;
  canPublish?: boolean;
};

export function GenerationPreviewWorkspace({
  items,
  index,
  onIndexChange,
  preview,
  onPublishCurrent,
  onPublishAll,
  onRetryFailed,
  onCancel,
  publishLabel,
  busy = false,
  canPublish = true,
}: GenerationPreviewWorkspaceProps) {
  const current = items[index];
  const total = items.length;
  const failedCount = items.filter((i) => i.publishStatus === "failed").length;
  const publishedCount = items.filter((i) => i.publishStatus === "published").length;
  const pendingCount = items.filter((i) => i.publishStatus === "pending").length;

  if (!current || total === 0) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-muted-foreground py-8 text-center">
            No generated items to preview.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Preview before publishing"
        hint="Review each item. Nothing is published until you confirm."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">
              {publishedCount}/{total} published
            </Pill>
            {failedCount > 0 ? <Pill tone="danger">{failedCount} failed</Pill> : null}
          </div>
        }
      />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || index <= 0}
              onClick={() => onIndexChange(index - 1)}
              aria-label="Previous item"
            >
              <ArrowLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || index >= total - 1}
              onClick={() => onIndexChange(index + 1)}
              aria-label="Next item"
            >
              Next
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Item <span className="font-medium text-foreground">{index + 1}</span> of{" "}
            <span className="font-medium text-foreground">{total}</span>
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium">{current.studentName}</p>
          {current.subtitle ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">{current.subtitle}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            <Pill
              tone={
                current.publishStatus === "published"
                  ? "success"
                  : current.publishStatus === "failed"
                    ? "danger"
                    : current.publishStatus === "publishing"
                      ? "warning"
                      : "neutral"
              }
            >
              {current.publishStatus}
            </Pill>
            {current.documentNumber ? (
              <Pill tone="neutral">{current.documentNumber}</Pill>
            ) : (
              <Pill tone="neutral">Number assigned on publish</Pill>
            )}
          </div>
          {current.errorMessage ? (
            <p className="mt-2 text-xs text-destructive">{current.errorMessage}</p>
          ) : null}
        </div>

        <div className="rounded-xl border border-dashed border-border px-4 py-6 min-h-[12rem]">
          {preview}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <div className="flex flex-wrap gap-2">
            {failedCount > 0 ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={onRetryFailed}
              >
                Retry failed ({failedCount})
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={busy || !canPublish || current.publishStatus === "published"}
              onClick={onPublishCurrent}
            >
              {busy && current.publishStatus === "publishing" ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : null}
              {publishLabel} this
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={busy || !canPublish || pendingCount + failedCount === 0}
              onClick={onPublishAll}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {publishLabel} all remaining
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
