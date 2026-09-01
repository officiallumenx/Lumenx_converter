import {
  Input,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lumenx/ui";
import { gradeFor, isPassing } from "@/lib/marks-utils";
import type { ConnectMarkRow } from "@/lib/marks/types";
import type { MarkEntryStatus } from "@/lib/marks/types";

function normalizeTo100(marks: number, maxMarks: number): number {
  return maxMarks > 0 ? Math.round((marks / maxMarks) * 100) : marks;
}

export function ApiMarksTable({
  rows,
  maxMarks,
  status,
  onUpdate,
  readOnly,
}: {
  rows: ConnectMarkRow[];
  maxMarks: number;
  status: MarkEntryStatus | "none";
  onUpdate: (enrollmentId: string, marks: number | null) => void;
  readOnly?: boolean;
}) {
  const locked =
    readOnly || status === "published" || status === "submitted";

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[160px]">Student</TableHead>
            <TableHead className="w-[120px]">Marks /{maxMarks}</TableHead>
            <TableHead className="w-[80px]">Total /100</TableHead>
            <TableHead className="w-[70px]">Grade</TableHead>
            <TableHead className="w-[80px]">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const total =
              r.marks == null ? null : normalizeTo100(r.marks, maxMarks);
            const passed = total != null && isPassing(total);
            return (
              <TableRow key={r.enrollmentId} className="hover:bg-muted/20">
                <TableCell>
                  <div className="font-medium">{r.studentName}</div>
                  <div className="text-xs text-muted-foreground">Roll {r.roll}</div>
                </TableCell>
                <TableCell>
                  {locked ? (
                    <span className="tabular-nums">{r.marks ?? "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={maxMarks}
                      value={r.marks ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        onUpdate(
                          r.enrollmentId,
                          v === "" ? null : Math.max(0, Math.min(maxMarks, Number(v))),
                        );
                      }}
                      className="h-9 w-24"
                    />
                  )}
                </TableCell>
                <TableCell className="font-semibold tabular-nums">{total ?? "—"}</TableCell>
                <TableCell>
                  {total != null ? (
                    <Badge variant="outline">{gradeFor(total)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {total != null ? (
                    <Badge
                      className={
                        passed
                          ? "border-0 bg-success/15 text-success"
                          : "border-0 bg-destructive/15 text-destructive"
                      }
                    >
                      {passed ? "Pass" : "Fail"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Pending</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ApiMarksAnalytics({
  rows,
  maxMarks,
}: {
  rows: ConnectMarkRow[];
  maxMarks: number;
}) {
  const scored = rows
    .map((r) => (r.marks == null ? null : normalizeTo100(r.marks, maxMarks)))
    .filter((t): t is number => t != null);
  if (!scored.length) return null;
  const avg = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  const highest = Math.max(...scored);
  const lowest = Math.min(...scored);
  const passCount = scored.filter((t) => isPassing(t)).length;
  const failCount = scored.length - passCount;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
      {[
        { label: "Class average", value: `${avg}/100` },
        { label: "Highest", value: `${highest}/100` },
        { label: "Lowest", value: `${lowest}/100` },
        { label: "Passed", value: String(passCount), cls: "bg-success/10" },
        {
          label: "Failed",
          value: String(failCount),
          cls: failCount > 0 ? "bg-destructive/10" : "bg-muted/30",
        },
      ].map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border border-border p-3 text-center ${s.cls ?? "bg-muted/30"}`}
        >
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="font-display text-lg font-semibold tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
