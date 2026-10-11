import { describe, expect, it } from "vitest";
import {
  STUDENTS_LIST_DEFAULT_LIMIT,
  STUDENTS_LIST_MAX_LIMIT,
} from "./repository.js";

describe("students list safety caps", () => {
  it("exposes conservative default and hard max", () => {
    expect(STUDENTS_LIST_DEFAULT_LIMIT).toBe(100);
    expect(STUDENTS_LIST_MAX_LIMIT).toBe(200);
    expect(STUDENTS_LIST_DEFAULT_LIMIT).toBeLessThanOrEqual(STUDENTS_LIST_MAX_LIMIT);
  });
});
