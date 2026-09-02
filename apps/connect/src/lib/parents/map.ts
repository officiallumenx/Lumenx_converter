import type { Child } from "@lumenx/types";
import type { ReportCard } from "@lumenx/types";
import { studentDisplayName, studentInitials } from "@/lib/students/map";
import type { StudentDto } from "@/lib/students/types";

const ACCENTS: Child["accent"][] = ["primary", "success", "warning"];

function classDisplayLabel(classLabel: string | null | undefined): string {
  const trimmed = classLabel?.trim();
  if (!trimmed) return "—";
  return /class/i.test(trimmed) ? trimmed : `Class ${trimmed}`;
}

function scoreTrend(current: number, previous: number | null): Child["trend"] {
  if (previous == null) return "flat";
  if (current > previous + 1) return "up";
  if (current < previous - 1) return "down";
  return "flat";
}

export function studentDtoToChild(
  dto: StudentDto,
  index: number,
  metrics: { attendancePct: number; avgScore: number; trend: Child["trend"] } = {
    attendancePct: 0,
    avgScore: 0,
    trend: "flat",
  },
): Child {
  const name = studentDisplayName(dto);
  return {
    id: dto.id,
    name,
    initials: studentInitials(name),
    className: classDisplayLabel(dto.classLabel),
    section: dto.sectionLabel?.trim() || "—",
    rollNo: dto.rollNo?.trim() || "—",
    attendance: Math.round(metrics.attendancePct),
    avgScore: Math.round(metrics.avgScore),
    trend: metrics.trend,
    accent: ACCENTS[index % ACCENTS.length] ?? "primary",
  };
}

export function reportCardsToChildMetrics(cards: ReportCard[]): {
  avgScore: number;
  trend: Child["trend"];
} {
  const published = cards.filter((c) => c.status === "published");
  const latest = published.at(-1);
  const previous = published.length >= 2 ? published.at(-2) : null;
  const avgScore = latest?.percentage ?? 0;
  return {
    avgScore,
    trend: scoreTrend(avgScore, previous?.percentage ?? null),
  };
}
