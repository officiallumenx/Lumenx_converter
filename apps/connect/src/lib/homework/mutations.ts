import { isApiAuthMode } from "@/auth/auth-mode";
import {
  createHomework,
  expireHomework,
  publishHomework,
  updateHomework,
  updateHomeworkSubmission,
  uploadHomeworkPdf,
} from "./api";
import type { CreateHomeworkInput, UpdateHomeworkInput } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Homework API is only available in API auth mode");
  }
}

export async function saveHomeworkDraft(input: {
  homeworkId: string | null;
  createInput: CreateHomeworkInput | null;
  updateInput: UpdateHomeworkInput;
}) {
  assertApiMode();
  if (input.homeworkId) {
    return updateHomework(input.homeworkId, input.updateInput);
  }
  if (!input.createInput) {
    throw new Error("createInput is required when homeworkId is missing");
  }
  return createHomework(input.createInput);
}

export async function publishHomeworkItem(homeworkId: string) {
  assertApiMode();
  return publishHomework(homeworkId);
}

export async function expireHomeworkItem(homeworkId: string) {
  assertApiMode();
  return expireHomework(homeworkId);
}

export async function toggleHomeworkSubmission(submissionId: string, submitted: boolean) {
  assertApiMode();
  return updateHomeworkSubmission(submissionId, submitted ? "submitted" : "missing");
}

export async function attachHomeworkPdf(input: {
  instituteId: string;
  homeworkId: string;
  file: File;
}) {
  assertApiMode();
  if (input.file.type && input.file.type !== "application/pdf") {
    throw new Error("Only PDF files are supported");
  }
  const asset = await uploadHomeworkPdf({
    instituteId: input.instituteId,
    file: input.file,
    homeworkId: input.homeworkId,
  });
  return updateHomework(input.homeworkId, { attachmentAssetId: asset.id });
}
