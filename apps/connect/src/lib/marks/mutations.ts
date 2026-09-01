import { isApiAuthMode } from "@/auth/auth-mode";
import {
  createMarkEntry,
  submitMarkEntry,
  updateMarkEntry,
} from "./api";
import type { CreateMarkEntryInput, UpdateMarkEntryInput } from "./types";

function assertApiMode(): void {
  if (!isApiAuthMode()) {
    throw new Error("Marks API is only available in API auth mode");
  }
}

export async function saveTeacherMarkSheet(input: {
  entryId: string | null;
  createInput: CreateMarkEntryInput | null;
  updateInput: UpdateMarkEntryInput;
}) {
  assertApiMode();
  if (input.entryId) {
    return updateMarkEntry(input.entryId, input.updateInput);
  }
  if (!input.createInput) {
    throw new Error("createInput is required when entryId is missing");
  }
  return createMarkEntry({
    ...input.createInput,
    scores: input.updateInput.scores,
    maxMarks: input.updateInput.maxMarks ?? input.createInput.maxMarks,
  });
}

export async function submitTeacherMarkEntry(entryId: string) {
  assertApiMode();
  return submitMarkEntry(entryId);
}
