import { describe, expect, it } from "vitest";
import {
  careerApplicationDtoToJobApplication,
  careerJobDtoToPosting,
} from "./map";
import type { CareerApplicationDto, CareerJobDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("careers api map", () => {
  it("maps job dto to JobPosting", () => {
    const dto: CareerJobDto = {
      id: "jj111111-1111-4111-8111-111111111111",
      instituteId: INST,
      title: "Math Teacher",
      slug: "math-teacher",
      description: "Teach mathematics to senior grades.",
      category: "Teaching",
      employmentType: "full_time",
      workMode: "onsite",
      locationLabel: "Hyderabad, Telangana",
      openingsCount: 2,
      status: "open",
      createdByUserId: "uu111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };

    const posting = careerJobDtoToPosting(dto, "Demo Institute");
    expect(posting.title).toBe("Math Teacher");
    expect(posting.instituteName).toBe("Demo Institute");
    expect(posting.city).toBe("Hyderabad");
    expect(posting.state).toBe("Telangana");
    expect(posting.recruiterJobStatus).toBe("open");
  });

  it("maps application dto to JobApplication", () => {
    const dto: CareerApplicationDto = {
      id: "ca111111-1111-4111-8111-111111111111",
      instituteId: INST,
      jobId: "jj111111-1111-4111-8111-111111111111",
      candidateProfileId: null,
      applicantUserId: "uu111111-1111-4111-8111-111111111111",
      status: "under_review",
      coverLetter: null,
      payload: { name: "Priya Nair", jobTitle: "Math Teacher" },
      decisionNote: null,
      convertedTeacherId: null,
      submittedAt: "2026-06-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };

    const app = careerApplicationDtoToJobApplication(dto, {
      candidateId: "uu111111-1111-4111-8111-111111111111",
    });
    expect(app.jobTitle).toBe("Math Teacher");
    expect(app.personal.name).toBe("Priya Nair");
    expect(app.status).toBe("under_review");
  });

  it("maps interview details from application payload", () => {
    const dto: CareerApplicationDto = {
      id: "ca111111-1111-4111-8111-111111111111",
      instituteId: INST,
      jobId: "jj111111-1111-4111-8111-111111111111",
      candidateProfileId: null,
      applicantUserId: "uu111111-1111-4111-8111-111111111111",
      status: "interview_scheduled",
      coverLetter: null,
      payload: {
        interview: {
          date: "2026-05-28",
          time: "10:30 AM",
          mode: "video",
          location: "Google Meet",
          instructions: "Prepare demo lesson",
          status: "scheduled",
        },
      },
      decisionNote: null,
      convertedTeacherId: null,
      submittedAt: "2026-06-01T10:00:00Z",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
    };

    const app = careerApplicationDtoToJobApplication(dto, {
      candidateId: "uu111111-1111-4111-8111-111111111111",
    });
    expect(app.interview?.date).toBe("2026-05-28");
    expect(app.interview?.mode).toBe("video");
  });
});
