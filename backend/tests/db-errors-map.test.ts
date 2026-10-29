import { describe, it, expect } from "vitest";
import { mapDbError } from "../src/db/errors.js";
import { AppError } from "../src/errors/app-error.js";

describe("mapDbError unique conflicts", () => {
  it("does not map diary-reminder dedupe (scope=subject) to subject-catalog conflict", () => {
    expect(() =>
      mapDbError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "notification_dedupe_key_key"',
        details:
          "Key (dedupe_key)=(diary-reminder:22222222-2222-4222-8222-222222222222:subject:2026-10-28) already exists.",
      }),
    ).toThrow(AppError);

    try {
      mapDbError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "notification_dedupe_key_key"',
        details:
          "Key (dedupe_key)=(diary-reminder:22222222-2222-4222-8222-222222222222:subject:2026-10-28) already exists.",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(409);
      expect(appErr.message).toBe("Diary reminder already recorded");
      expect(appErr.message).not.toMatch(/subject already exists/i);
    }
  });

  it("maps diary_day unique to diary conflict, not subject catalog", () => {
    try {
      mapDbError({
        code: "23505",
        message:
          'duplicate key value violates unique constraint "diary_day_institute_teacher_date_scope_key"',
        details:
          "Key (institute_id, teacher_id, diary_date, scope)=(aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, bb111111-1111-4111-8111-111111111111, 2026-10-28, subject) already exists.",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(409);
      expect(appErr.message).toMatch(/diary day already exists/i);
      expect(appErr.message).not.toMatch(/subject already exists/i);
    }
  });

  it("still maps real subject catalog unique violations", () => {
    try {
      mapDbError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "subject_institute_code_key"',
        details: "Key (institute_id, code)=(aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa, MATH) already exists.",
      });
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.status).toBe(409);
      expect(appErr.message).toMatch(/subject already exists/i);
    }
  });
});
