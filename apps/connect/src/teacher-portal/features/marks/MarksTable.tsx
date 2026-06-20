import { Input, Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lumenx/ui";
import { gradeFor } from "@/lib/teacher/mock-data";
import type { MarkEntry } from "@/lib/teacher/types";

function totalOf(r: MarkEntry): number | null {
  if (r.internal == null && r.exam == null) return null;
  return (r.internal ?? 0) + (r.exam ?? 0);
}

export function MarksTable({
  rows,
  onUpdate,
  readOnly,
}: {
  rows: MarkEntry[];
  onUpdate: (studentId: string, key: "internal" | "exam", value: number | null) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[160px]">Student</TableHead>
            <TableHead className="w-[100px]">Internal /20</TableHead>
            <TableHead className="w-[100px]">Exam /80</TableHead>
            <TableHead className="w-[80px]">Total</TableHead>
            <TableHead className="w-[70px]">Grade</TableHead>
            <TableHead className="w-[80px]">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const total = totalOf(r);
            const passed = total != null && total >= 33;
            return (
              <TableRow key={r.studentId} className="hover:bg-muted/20">
                <TableCell>
                  <div className="font-medium">{r.studentName}</div>
                  <div className="text-xs text-muted-foreground">Roll {r.roll}</div>
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="tabular-nums">{r.internal ?? "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={20}
                      value={r.internal ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        onUpdate(r.studentId, "internal", v === "" ? null : Math.max(0, Math.min(20, Number(v))));
                      }}
                      className="h-9 w-20"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {readOnly ? (
                    <span className="tabular-nums">{r.exam ?? "—"}</span>
                  ) : (
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={80}
                      value={r.exam ?? ""}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value;
                        onUpdate(r.studentId, "exam", v === "" ? null : Math.max(0, Math.min(80, Number(v))));
                      }}
                      className="h-9 w-20"
                    />
                  )}
                </TableCell>
                <TableCell className="font-semibold tabular-nums">{total ?? "—"}</TableCell>
                <TableCell>
                  {total != null ? <Badge variant="outline">{gradeFor(total)}</Badge> : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell>
                  {total != null ? (
                    <Badge className={passed ? "border-0 bg-success/15 text-success" : "border-0 bg-destructive/15 text-destructive"}>
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

export function MarksAnalytics({ rows }: { rows: MarkEntry[] }) {
  const scored = rows.map((r) => totalOf(r)).filter((t): t is number => t != null);
  if (!scored.length) return null;
  const avg = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  const highest = Math.max(...scored);
  const lowest = Math.min(...scored);
  const passCount = scored.filter((t) => t >= 33).length;
  const failCount = scored.length - passCount;

  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
      {[
        { label: "Class average", value: `${avg}/100` },
        { label: "Highest", value: `${highest}/100` },
        { label: "Lowest", value: `${lowest}/100` },
        { label: "Passed", value: String(passCount), cls: "bg-success/10" },
        { label: "Failed", value: String(failCount), cls: failCount > 0 ? "bg-destructive/10" : "bg-muted/30" },
      ].map((s) => (
        <div key={s.label} className={`rounded-xl border border-border p-3 text-center ${s.cls ?? "bg-muted/30"}`}>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
          <div className="font-display text-lg font-semibold tabular-nums">{s.value}</div>
        </div>
      ))}
    </div>
  );
}
