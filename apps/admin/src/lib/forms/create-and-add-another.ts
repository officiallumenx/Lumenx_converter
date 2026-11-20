/**
 * Shared post-create outcome for "Create" vs "Create & Add Another".
 * Call only after the backend confirms success.
 */

export type CreateSubmitMode = "create" | "create_and_add_another";

export type CreateSubmitOutcome = {
  /** Keep the form open and reset for the next record. */
  stayOpen: boolean;
  /** Clear validation errors after a successful save. */
  clearErrors: boolean;
  /** Preserve parent context (e.g. class when adding another section). */
  keepParentContext: boolean;
};

export function outcomeAfterSuccessfulCreate(mode: CreateSubmitMode): CreateSubmitOutcome {
  if (mode === "create_and_add_another") {
    return { stayOpen: true, clearErrors: true, keepParentContext: true };
  }
  return { stayOpen: false, clearErrors: true, keepParentContext: false };
}

/** Ignore repeated clicks while a create request is in flight. */
export function shouldIgnoreDuplicateCreateClick(busy: boolean): boolean {
  return busy;
}

/**
 * After a failed create, do not reset form fields.
 * (Callers must only call reset helpers when this returns true.)
 */
export function shouldResetFormAfterCreateAttempt(opts: {
  succeeded: boolean;
}): boolean {
  return opts.succeeded;
}
