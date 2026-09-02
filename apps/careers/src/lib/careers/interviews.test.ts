import { describe, expect, it } from "vitest";
import {
  getInterviewsFromApplications,
  interviewFromApplicationPayload,
} from "./interviews";
import type { JobApplication } from "./types";

describe("careers interviews", () => {
  it("extracts interview object from application payload", () => {
    const interview = interviewFromApplicationPayload(
      {
        interview: {
          date: "2026-05-28",
          time: "10:30 AM",
          mode: "video",
          location: "Google Meet",
          instructions: "Prepare a demo lesson.",
          status: "scheduled",
        },
      },
      "interview_scheduled",
      "2026-05-20T10:00:00Z",
      null,
    );
    expect(interview?.date).toBe("2026-05-28");
    expect(interview?.mode).toBe("video");
  });

  it("synthesizes interview when status is interview_scheduled", () => {
    const interview = interviewFromApplicationPayload(
      {},
      "interview_scheduled",
      "2026-05-20T10:00:00Z",
      "Panel interview with HOD",
    );
    expect(interview?.status).toBe("scheduled");
    expect(interview?.instructions).toContain("Panel interview");
  });

  it("lists interviews from applications", () => {
    const apps = [
      {
        id: "app-1",
        jobTitle: "Math Teacher",
        instituteName: "Demo School",
        status: "interview_scheduled",
        interview: {
          date: "2026-05-28",
          time: "10:30 AM",
          mode: "video",
          location: "Meet",
          instructions: "Demo",
          status: "scheduled",
        },
      },
      { id: "app-2", jobTitle: "Coach", instituteName: "Demo School", status: "submitted" },
    ] as JobApplication[];

    expect(getInterviewsFromApplications(apps)).toHaveLength(1);
  });
});
