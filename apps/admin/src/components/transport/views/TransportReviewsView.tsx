import { TransportApprovalPanel } from "@/components/transport/TransportApprovalPanel";
import { PageStack } from "@lumenx/ui-admin";

/**
 * Dedicated Admin review queue for driver Transport submissions.
 */
export function TransportReviewsView() {
  return (
    <PageStack>
      <TransportApprovalPanel
        title="Pending Transport requests"
        hint="Approve to activate · Decline requires a reason shown to the driver for Edit & Resubmit"
      />
    </PageStack>
  );
}
