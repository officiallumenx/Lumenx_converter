import { afterEach, describe, expect, it } from "vitest";
import { clearMainScrollMemory, readMainScroll, saveMainScroll } from "./main-scroll-memory";

describe("main-scroll-memory", () => {
  afterEach(() => {
    clearMainScrollMemory();
  });

  it("saves, reads, and clears positions", () => {
    expect(readMainScroll("/")).toBe(0);
    saveMainScroll("/", 240);
    saveMainScroll("/attendance", 80);
    expect(readMainScroll("/")).toBe(240);
    expect(readMainScroll("/attendance")).toBe(80);
    clearMainScrollMemory();
    expect(readMainScroll("/")).toBe(0);
    expect(readMainScroll("/attendance")).toBe(0);
  });

  it("clamps negative scroll to zero", () => {
    saveMainScroll("/", -12);
    expect(readMainScroll("/")).toBe(0);
  });
});
