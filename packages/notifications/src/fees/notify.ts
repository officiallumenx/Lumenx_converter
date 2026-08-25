/**
 * Fees notifications — offline office payments only (no payment gateway).
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";

export type FeesNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function renderFee(input: {
  templateId: string;
  id: string;
  variables: Record<string, string | number>;
  metadata?: Record<string, string>;
}): FeesNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const foundation = buildNotification({
    id: input.id,
    category: "fees",
    title: rendered.title,
    message: rendered.body,
    source: "fees",
    audience: "parent",
    priority,
    href: "/fees",
    templateId: rendered.id,
    metadata: input.metadata,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "fees",
        title: foundation.title,
        message: foundation.message,
        source: "fees",
        audience: "parent",
        priority: foundation.priority,
        href: "/fees",
        templateId: foundation.templateId,
        metadata: foundation.metadata,
      },
      { category: "fees" },
    ),
  };
}

export function notifyFeeAdded(input: {
  feeLabel: string;
  amount: string;
  studentName?: string;
  studentId?: string;
  categoryId?: string;
}): FeesNotifyResult {
  const studentId = input.studentId ?? "all";
  return renderFee({
    templateId: IDS.fees.parent.feeAdded,
    id: `fee-added-${input.categoryId ?? input.feeLabel}-${studentId}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      studentName: input.studentName ?? "your child",
      dueDate: "",
      receiptId: "",
    },
    metadata: {
      kind: "fee_added",
      studentId,
      categoryId: input.categoryId ?? "",
    },
  });
}

export function notifyFeeDue(input: {
  feeLabel: string;
  amount: string;
  dueDate: string;
  studentId?: string;
}): FeesNotifyResult {
  const studentId = input.studentId ?? "all";
  return renderFee({
    templateId: IDS.fees.parent.feeDue,
    id: `fee-due-${input.feeLabel}-${studentId}-${input.dueDate}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      dueDate: input.dueDate,
      studentName: "",
      receiptId: "",
    },
    metadata: { kind: "fee_due", studentId },
  });
}

export function notifyFeeDueReminder(input: {
  feeLabel: string;
  amount: string;
  dueDate: string;
  studentId?: string;
}): FeesNotifyResult {
  const studentId = input.studentId ?? "all";
  return renderFee({
    templateId: IDS.fees.parent.dueReminder,
    id: `fee-reminder-${input.feeLabel}-${studentId}-${input.dueDate}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      dueDate: input.dueDate,
      studentName: "",
      receiptId: "",
    },
    metadata: { kind: "due_reminder", studentId },
  });
}

export function notifyFeeOverdue(input: {
  feeLabel: string;
  amount: string;
  dueDate: string;
  studentId?: string;
}): FeesNotifyResult {
  const studentId = input.studentId ?? "all";
  return renderFee({
    templateId: IDS.fees.parent.overdue,
    id: `fee-overdue-${input.feeLabel}-${studentId}-${input.dueDate}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      dueDate: input.dueDate,
      studentName: "",
      receiptId: "",
    },
    metadata: { kind: "overdue", studentId },
  });
}

export function notifyFeePaymentReceived(input: {
  feeLabel: string;
  amount: string;
  receiptId: string;
  studentId: string;
}): FeesNotifyResult {
  return renderFee({
    templateId: IDS.fees.parent.paymentReceived,
    id: `fee-paid-${input.receiptId}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      receiptId: input.receiptId,
      dueDate: "",
      studentName: "",
    },
    metadata: {
      kind: "payment_received",
      studentId: input.studentId,
      receiptId: input.receiptId,
    },
  });
}

export function notifyFeeReceiptAvailable(input: {
  feeLabel: string;
  amount: string;
  receiptId: string;
  studentId: string;
}): FeesNotifyResult {
  return renderFee({
    templateId: IDS.fees.parent.receiptAvailable,
    id: `fee-receipt-${input.receiptId}`,
    variables: {
      feeLabel: input.feeLabel,
      amount: input.amount,
      receiptId: input.receiptId,
      dueDate: "",
      studentName: "",
    },
    metadata: {
      kind: "receipt_available",
      studentId: input.studentId,
      receiptId: input.receiptId,
    },
  });
}
