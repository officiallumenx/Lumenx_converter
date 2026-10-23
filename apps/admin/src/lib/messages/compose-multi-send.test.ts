import { describe, expect, it } from "vitest";
import {
  planDirectMultiSend,
  summarizeMultiSendResults,
} from "./compose-multi-send";

describe("compose multi-send", () => {
  it("rejects empty selection and dedupes user ids", () => {
    expect(planDirectMultiSend([])).toEqual({
      ok: false,
      error: "Select at least one recipient",
    });
    expect(
      planDirectMultiSend([
        { userId: "a" },
        { userId: "a" },
        { userId: "b" },
      ]),
    ).toEqual({ ok: true, userIds: ["a", "b"] });
  });

  it("summarizes partial delivery failures", () => {
    expect(
      summarizeMultiSendResults([
        { userId: "a", ok: true },
        { userId: "b", ok: false, error: "forbidden" },
      ]),
    ).toBe("1 started · 1 failed");
    expect(
      summarizeMultiSendResults([{ userId: "a", ok: true }]),
    ).toBe("Conversation started");
  });
});
