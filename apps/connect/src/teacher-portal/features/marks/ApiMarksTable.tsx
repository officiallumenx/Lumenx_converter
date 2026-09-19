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

function splitCeilings(
  maxMarks: number,
  internalMax: number | null,
  externalMax: number | null,
): { internalCeiling: number; externalCeiling: number; split: boolean } {
  if (internalMax == null && externalMax == null) {
    return { internalCeiling: maxMarks, externalCeiling: maxMarks, split: false };
  }
  let internalCeiling = internalMax ?? 0;
  let externalCeiling = externalMax ?? Math.max(0, maxMarks - internalCeiling);
  if (internalMax != null && externalMax == null) {
    externalCeiling = Math.max(0, maxMarks - internalMax);
  }
  if (externalMax != null && internalMax == null) {
    internalCeiling = Math.max(0, maxMarks - externalMax);
  }
  const sum = internalCeiling + externalCeiling;
  // Keep ceilings aligned to exam total when stored split drifts (e.g. 20+80 vs total 50).
  if (sum > 0 && sum !== maxMarks) {
    internalCeiling = Math.round((internalCeiling / sum) * maxMarks);
    externalCeiling = Math.max(0, maxMarks - internalCeiling);
  }
  return {
    internalCeiling,
    externalCeiling,
    split: internalMax != null || externalMax != null,
  };
}

export function ApiMarksTable({
  rows,
  maxMarks,
  internalMax,
  externalMax,
  status,
  onUpdate,
  readOnly,
}: {
  rows: ConnectMarkRow[];
  maxMarks: number;
  internalMax: number | null;
  externalMax: number | null;
  status: MarkEntryStatus | "none";
  onUpdate: (
    enrollmentId: string,
    patch: {
      internalMarks: number | null;
      externalMarks: number | null;
      marks: number | null;
    },
  ) => void;
  readOnly?: boolean;
}) {
  const locked =
    readOnly || status === "published" || status === "submitted";
  const { internalCeiling, externalCeiling, split } = splitCeilings(
    maxMarks,
    internalMax,
    externalMax,
  );

  return (
    <div className="overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="min-w-[160px]">Student</TableHead>
            {split ? (
              <>
                <TableHead className="w-[110px]">Internal /{internalCeiling}</TableHead>
                <TableHead className="w-[110px]">External /{externalCeiling}</TableHead>
              </>
            ) : null}
            <TableHead className="w-[110px]">Total /{maxMarks}</TableHead>
            <TableHead className="w-[70px]">Grade</TableHead>
            <TableHead className="w-[80px]">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => {
            const pct =
              r.marks == null ? null : normalizeTo100(r.marks, maxMarks);
            const passed = pct != null && isPassing(pct);
            return (
              <TableRow key={r.enrollmentId} className="hover:bg-muted/20">
                <TableCell>
                  <div className="font-medium">{r.studentName}</div>
                  <div className="text-xs text-muted-foreground">Roll {r.roll}</div>
                </TableCell>
                {split ? (
                  <>
                    <TableCell>
                      {locked ? (
                        <span className="tabular-nums">{r.internalMarks ?? "—"}</span>
                      ) : (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={internalCeiling}
                          value={r.internalMarks ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            const internal =
                              v === ""
                                ? null
                                : Math.max(0, Math.min(internalCeiling, Number(v)));
                            const external = r.externalMarks;
                            const marks =
                              internal != null && external != null
                                ? Math.min(maxMarks, internal + external)
                                : null;
                            onUpdate(r.enrollmentId, {
                              internalMarks: internal,
                              externalMarks: external,
                              marks,
                            });
                          }}
                          className="h-9 w-20"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      {locked ? (
                        <span className="tabular-nums">{r.externalMarks ?? "—"}</span>
                      ) : (
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={externalCeiling}
                          value={r.externalMarks ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const v = e.target.value;
                            const external =
                              v === ""
                                ? null
                                : Math.max(0, Math.min(externalCeiling, Number(v)));
                            const internal = r.internalMarks;
                            const marks =
                              internal != null && external != null
                                ? Math.min(maxMarks, internal + external)
                                : null;
                            onUpdate(r.enrollmentId, {
                              internalMarks: internal,
                              externalMarks: external,
                              marks,
                            });
                          }}
                          className="h-9 w-20"
                        />
                      )}
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="font-semibold tabular-nums">
                  {locked || split ? (
                    r.marks ?? "—"
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
                        const marks =
                          v === ""
                            ? null
                            : Math.max(0, Math.min(maxMarks, Number(v)));
                        onUpdate(r.enrollmentId, {
                          internalMarks: null,
                          externalMarks: null,
                          marks,
                        });
                      }}
                      className="h-9 w-20"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {pct != null ? (
                    <Badge variant="outline">{gradeFor(pct)}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  {pct != null ? (
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
  const entered = rows.filter((r) => r.marks != null);
  const avg =
    entered.length === 0
      ? null
      : Math.round(
          entered.reduce((sum, r) => sum + (r.marks ?? 0), 0) / entered.length,
        );
  const passCount = entered.filter(
    (r) => r.marks != null && isPassing(normalizeTo100(r.marks, maxMarks)),
  ).length;

  return (
    <div className="grid grid-cols-3 gap-3 text-sm">
      <div className="rounded-xl border bg-card p-3">
        <div className="text-muted-foreground">Entered</div>
        <div className="text-lg font-semibold">
          {entered.length}/{rows.length}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <div className="text-muted-foreground">Average /{maxMarks}</div>
        <div className="text-lg font-semibold">{avg ?? "—"}</div>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <div className="text-muted-foreground">Pass</div>
        <div className="text-lg font-semibold">
          {entered.length === 0 ? "—" : `${passCount}/${entered.length}`}
        </div>
      </div>
    </div>
  );
}
