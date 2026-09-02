import type { InterviewDetails, JobApplication } from "../types";
import type { InterviewMode } from "@lumenx/types";

export type InterviewListItem = {
  applicationId: string;
  jobTitle: string;
  instituteName: string;
  status: JobApplication["status"];
  interview: InterviewDetails;
};

function normalizeInterviewMode(value: unknown): InterviewMode {
  if (value === "in_person" || value === "phone" || value === "video") return value;
  if (typeof value === "string") {
    const key = value.trim().toLowerCase();
    if (key.includes("video") || key.includes("meet") || key.includes("zoom")) return "video";
    if (key.includes("phone") || key.includes("call")) return "phone";
    if (key.includes("person") || key.includes("onsite") || key.includes("campus")) {
      return "in_person";
    }
  }
  return "video";
}

export function interviewFromApplicationPayload(
  payload: unknown,
  status: JobApplication["status"],
  updatedAt: string,
  decisionNote: string | null,
): InterviewDetails | undefined {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const raw = record.interview;
    if (raw && typeof raw === "object") {
      const interview = raw as Record<string, unknown>;
      const interviewStatus =
        interview.status === "completed" ||
        interview.status === "cancelled" ||
        interview.status === "scheduled"
          ? interview.status
          : status === "interview_completed"
            ? "completed"
            : "scheduled";
      return {
        date: String(interview.date ?? updatedAt.slice(0, 10)),
        time: String(interview.time ?? "—"),
        mode: normalizeInterviewMode(interview.mode),
        location: String(interview.location ?? "—"),
        instructions: String(interview.instructions ?? decisionNote ?? ""),
        status: interviewStatus,
      };
    }
  }

  if (status !== "interview_scheduled" && status !== "interview_completed") {
    return undefined;
  }

  return {
    date: updatedAt.slice(0, 10),
    time: "—",
    mode: "video",
    location: "See application details",
    instructions: decisionNote ?? "Check your email or application page for interview details.",
    status: status === "interview_completed" ? "completed" : "scheduled",
  };
}

export function getInterviewsFromApplications(
  applications: JobApplication[],
): InterviewListItem[] {
  return applications
    .filter((app) => app.interview)
    .map((app) => ({
      applicationId: app.id,
      jobTitle: app.jobTitle,
      instituteName: app.instituteName,
      status: app.status,
      interview: app.interview!,
    }));
}
