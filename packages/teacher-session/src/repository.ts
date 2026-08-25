import { mockTeacherAssignment } from "./mock-data";
import type { TeacherAssignment } from "./types";

/**
 * Resolves teacher assignment for portal routing.
 * Swap this implementation for an API client when backend is available.
 */
export interface TeacherSessionRepository {
  getAssignment(
    teacherId: string,
    hints?: { email?: string; phone?: string },
  ): Promise<TeacherAssignment>;
}

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms));

export const mockTeacherSessionRepository: TeacherSessionRepository = {
  async getAssignment(teacherId, hints) {
    await delay();
    return mockTeacherAssignment(teacherId, hints);
  },
};

/** Active repository — replace with a remote implementation for production. */
export const teacherSessionRepository: TeacherSessionRepository = mockTeacherSessionRepository;
