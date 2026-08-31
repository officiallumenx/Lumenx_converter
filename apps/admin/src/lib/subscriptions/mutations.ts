import { ApiClientError } from "@/lib/api";
import { submitOfflinePayment } from "./api";
import type { OfflinePaymentSubmissionDto, SubmitOfflinePaymentInput } from "./types";

export type OfflineSubmitResult =
  | { ok: true; submission: OfflinePaymentSubmissionDto }
  | { ok: false; message: string; conflict: boolean };

export async function performOfflinePaymentSubmit(
  input: SubmitOfflinePaymentInput,
): Promise<OfflineSubmitResult> {
  const referenceId = input.referenceId.trim();
  if (!referenceId) {
    return { ok: false, message: "Transaction / reference ID is required.", conflict: false };
  }
  try {
    const submission = await submitOfflinePayment({ ...input, referenceId });
    return { ok: true, submission };
  } catch (err) {
    const conflict =
      err instanceof ApiClientError &&
      (err.status === 409 || err.code === "CONFLICT");
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Failed to submit payment.",
      conflict,
    };
  }
}
