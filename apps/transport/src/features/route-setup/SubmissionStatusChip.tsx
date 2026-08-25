import { StatusChip } from "@/components/ui/status-chip";
import type { SubmissionStatus } from "@/lib/transport/route-setup/types";
import { SUBMISSION_STATUS_LABEL } from "@/lib/transport/route-setup/types";

const TONE: Record<
  SubmissionStatus,
  "success" | "warning" | "neutral" | "danger" | "transport"
> = {
  draft: "neutral",
  pending: "transport",
  approved: "success",
  rejected: "danger",
};

export function SubmissionStatusChip({ status }: { status: SubmissionStatus }) {
  return <StatusChip label={SUBMISSION_STATUS_LABEL[status]} tone={TONE[status]} />;
}
