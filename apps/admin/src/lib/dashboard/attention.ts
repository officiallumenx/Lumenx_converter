/**
 * Unified Home "Needs Attention" aggregator.
 * Merges pending-reviews queues + operational widget signals with dedupe.
 * Pure — no network. Prefer review-queue counts over duplicate widget counts.
 */

export type AttentionSeverity = "info" | "attention" | "urgent" | "critical";

export type AttentionItem = {
  id: string;
  label: string;
  count: number;
  severity: AttentionSeverity;
  to:
    | "/transport"
    | "/marks"
    | "/leave"
    | "/complaints"
    | "/diary"
    | "/student-attendance"
    | "/admissions"
    | "/careers";
  search?: Record<string, string>;
  actionLabel: string;
};

export type AttentionInput = {
  /** Pending-reviews style queues (preferred for review workflows). */
  submittedMarks?: number;
  pendingLeave?: number;
  openComplaints?: number;
  pendingAdmissionConverts?: number;
  pendingCareerHires?: number;
  pendingTransportStops?: number;
  pendingTransportAssignments?: number;
  /** Operational widget gaps (only if not already covered). */
  attendanceDraftCount?: number;
  diaryMissingYesterdayCount?: number;
  marksPendingWidgetCount?: number;
  /** Live SOS. */
  transportEmergencyCount?: number;
};

const SEVERITY_RANK: Record<AttentionSeverity, number> = {
  critical: 0,
  urgent: 1,
  attention: 2,
  info: 3,
};

function pushIfPositive(
  items: AttentionItem[],
  seen: Set<string>,
  item: AttentionItem,
): void {
  if (item.count <= 0) return;
  if (seen.has(item.id)) return;
  seen.add(item.id);
  items.push(item);
}

/**
 * Build a deduped, severity-sorted Needs Attention list.
 * Marks: prefer pending-reviews `submittedMarks`; skip widget marks if already present.
 */
export function buildNeedsAttentionItems(input: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  const seen = new Set<string>();

  pushIfPositive(items, seen, {
    id: "transport-sos",
    label: "Transport emergencies",
    count: input.transportEmergencyCount ?? 0,
    severity: "critical",
    to: "/transport",
    search: { view: "emergencies" },
    actionLabel: "View",
  });

  pushIfPositive(items, seen, {
    id: "marks-review",
    label: "Marks awaiting publish",
    count: input.submittedMarks ?? 0,
    severity: "attention",
    to: "/marks",
    actionLabel: "Review",
  });

  // Widget marks only if review queue did not already cover marks.
  if (!seen.has("marks-review")) {
    pushIfPositive(items, seen, {
      id: "marks-review",
      label: "Marks awaiting publish",
      count: input.marksPendingWidgetCount ?? 0,
      severity: "attention",
      to: "/marks",
      actionLabel: "Review",
    });
  }

  pushIfPositive(items, seen, {
    id: "diary-missing",
    label: "Teachers missing yesterday's diary",
    count: input.diaryMissingYesterdayCount ?? 0,
    severity: "attention",
    to: "/diary",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "attendance-drafts",
    label: "Attendance drafts today",
    count: input.attendanceDraftCount ?? 0,
    severity: "attention",
    to: "/student-attendance",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "leave",
    label: "Leave requests",
    count: input.pendingLeave ?? 0,
    severity: "attention",
    to: "/leave",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "complaints",
    label: "Open complaints",
    count: input.openComplaints ?? 0,
    severity: "attention",
    to: "/complaints",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "admissions",
    label: "Approved admissions to convert",
    count: input.pendingAdmissionConverts ?? 0,
    severity: "attention",
    to: "/admissions",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "careers",
    label: "Approved careers to hire",
    count: input.pendingCareerHires ?? 0,
    severity: "attention",
    to: "/careers",
    actionLabel: "Review",
  });

  pushIfPositive(items, seen, {
    id: "transport-stops",
    label: "Driver stops to accept",
    count: input.pendingTransportStops ?? 0,
    severity: "attention",
    to: "/transport",
    search: { view: "dashboard" },
    actionLabel: "Accept",
  });

  pushIfPositive(items, seen, {
    id: "transport-assignments",
    label: "Pending student assignments",
    count: input.pendingTransportAssignments ?? 0,
    severity: "attention",
    to: "/transport",
    search: { view: "reviews" },
    actionLabel: "Review",
  });

  return items.sort((a, b) => {
    const rank = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    if (rank !== 0) return rank;
    return b.count - a.count;
  });
}

export function attentionTotalCount(items: AttentionItem[]): number {
  return items.reduce((sum, item) => sum + item.count, 0);
}

export function attentionSeverityClass(severity: AttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "lx-home-sev-critical";
    case "urgent":
      return "lx-home-sev-urgent";
    case "attention":
      return "lx-home-sev-attention";
    default:
      return "lx-home-sev-info";
  }
}
