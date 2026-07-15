/** Compact, readable subject labels for bar chart X-axis ticks. */
const SUBJECT_CHART_LABELS: Record<string, string | string[]> = {
  Mathematics: "Math",
  Physics: "Phys",
  Chemistry: "Chem",
  English: "Eng",
  History: "Hist",
  Geography: "Geog",
  Biology: "Bio",
  "Computer Science": ["Comp", "Sci"],
  "Social Studies": ["Social", "Stud"],
  "Physical Education": ["P.E."],
  "Environmental Science": ["Env", "Sci"],
};

export function subjectChartLabelLines(subject: string): string[] {
  const mapped = SUBJECT_CHART_LABELS[subject];
  if (Array.isArray(mapped)) return mapped;
  if (typeof mapped === "string") return [mapped];

  const words = subject.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.slice(0, 2).map((word) => (word.length > 7 ? `${word.slice(0, 6)}…` : word));
  }
  if (subject.length > 9) return [`${subject.slice(0, 8)}…`];
  return [subject];
}

export function subjectChartLabel(subject: string): string {
  return subjectChartLabelLines(subject).join(" ");
}

export function getSubjectChartAxisHeight(lineCount = 1): number {
  return lineCount >= 2 ? 40 : 28;
}

export function getSubjectChartAxisHeightForSubjects(subjects: string[]): number {
  const maxLines = Math.max(1, ...subjects.map((s) => subjectChartLabelLines(s).length));
  return getSubjectChartAxisHeight(maxLines);
}

type AxisTickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
};

export function SubjectChartAxisTick({ x = 0, y = 0, payload }: AxisTickProps) {
  const lines = subjectChartLabelLines(payload?.value ?? "");
  const lineHeight = 11;

  return (
    <g transform={`translate(${x},${y})`}>
      <text fill="var(--muted-foreground)" fontSize={10} textAnchor="middle">
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x={0} dy={index === 0 ? 10 : lineHeight}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}
