import { ApiClientError } from "@/lib/api";
import { rejectPayment, verifyPayment } from "./api";
import type { OfflinePaymentSubmissionDto, PaymentDto } from "./api-types";

export type PaymentReviewAction = "verify" | "reject";

export type PaymentReviewSuccess = {
  ok: true;
  action: PaymentReviewAction;
  payment: PaymentDto;
};

export type PaymentReviewFailure = {
  ok: false;
  action: PaymentReviewAction;
  message: string;
  forbidden: boolean;
};

export type PaymentReviewResult = PaymentReviewSuccess | PaymentReviewFailure;

function toFailure(action: PaymentReviewAction, err: unknown): PaymentReviewFailure {
  const forbidden =
    err instanceof ApiClientError &&
    (err.status === 403 || err.code === "FORBIDDEN");
  return {
    ok: false,
    action,
    message: err instanceof Error ? err.message : "Review action failed.",
    forbidden,
  };
}

export async function performVerifyPayment(
  row: OfflinePaymentSubmissionDto,
): Promise<PaymentReviewResult> {
  try {
    const payment = await verifyPayment(row.paymentId);
    return { ok: true, action: "verify", payment };
  } catch (err) {
    return toFailure("verify", err);
  }
}

export async function performRejectPayment(
  row: OfflinePaymentSubmissionDto,
  reason: string,
): Promise<PaymentReviewResult> {
  const trimmed = reason.trim();
  if (!trimmed) {
    return {
      ok: false,
      action: "reject",
      message: "A rejection reason is required.",
      forbidden: false,
    };
  }
  try {
    const payment = await rejectPayment(row.paymentId, trimmed);
    return { ok: true, action: "reject", payment };
  } catch (err) {
    return toFailure("reject", err);
  }
}
