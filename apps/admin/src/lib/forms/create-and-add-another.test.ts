import { describe, expect, it } from "vitest";
import {
  outcomeAfterSuccessfulCreate,
  shouldIgnoreDuplicateCreateClick,
  shouldResetFormAfterCreateAttempt,
} from "./create-and-add-another";

describe("create and add another", () => {
  it("closes on normal create and stays open on add another", () => {
    expect(outcomeAfterSuccessfulCreate("create")).toEqual({
      stayOpen: false,
      clearErrors: true,
      keepParentContext: false,
    });
    expect(outcomeAfterSuccessfulCreate("create_and_add_another")).toEqual({
      stayOpen: true,
      clearErrors: true,
      keepParentContext: true,
    });
  });

  it("preserves parent context only for add-another (class→section)", () => {
    expect(outcomeAfterSuccessfulCreate("create_and_add_another").keepParentContext).toBe(
      true,
    );
    expect(outcomeAfterSuccessfulCreate("create").keepParentContext).toBe(false);
  });

  it("ignores duplicate clicks while busy (teachers/classes/subjects)", () => {
    expect(shouldIgnoreDuplicateCreateClick(true)).toBe(true);
    expect(shouldIgnoreDuplicateCreateClick(false)).toBe(false);
  });

  it("resets the form only after a confirmed successful save", () => {
    expect(shouldResetFormAfterCreateAttempt({ succeeded: true })).toBe(true);
    expect(shouldResetFormAfterCreateAttempt({ succeeded: false })).toBe(false);
  });
});
