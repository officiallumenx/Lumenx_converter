/**
 * Verification: method changes never mutate history; reports stay accurate.
 */

import { appendAttendanceConfig, replaceAttendanceConfigSnapshotForTests } from "./config-store";
import {
  assertRegistersUntouchedBy,
  resolveHistoricalDay,
} from "./history";
import { buildAttendanceHistoryReport } from "./reports";
import { clearAttendanceRegistersForTests, upsertSlotRegister } from "./register-store";
import type { AttendanceSlotRegister } from "./types";

export type HistoryVerificationResult = {
  id: string;
  passed: boolean;
  detail: string;
};

function sampleRegister(
  patch: Partial<AttendanceSlotRegister> &
    Pick<AttendanceSlotRegister, "id" | "date" | "slotId" | "method" | "configVersionId">,
): AttendanceSlotRegister {
  return {
    owner: "class_teacher",
    sectionKey: "10::B",
    classLabel: "10",
    section: "B",
    slotLabel: patch.slotId,
    slotKind: patch.method === "morning_afternoon" ? "morning" : "period",
    absentIds: ["s-absent"],
    leaveIds: [],
    status: "submitted",
    markedById: "t1",
    markedByName: "T",
    updatedAt: "2026-07-14T10:00:00.000Z",
    submittedAt: "2026-07-14T10:00:00.000Z",
    ...patch,
  };
}

export function runAttendanceHistoryVerification(): {
  passed: number;
  failed: number;
  results: HistoryVerificationResult[];
} {
  const results: HistoryVerificationResult[] = [];

  clearAttendanceRegistersForTests();
  replaceAttendanceConfigSnapshotForTests({
    versions: [
      {
        id: "cfg-ma",
        effectiveFrom: "2026-06-01",
        method: "morning_afternoon",
        owner: "class_teacher",
        scope: "institute",
        classTargets: [],
        sectionTargets: [],
        createdAt: "2026-05-01T00:00:00.000Z",
        createdBy: "Test",
      },
      {
        id: "cfg-period",
        effectiveFrom: "2026-09-01",
        method: "period_wise",
        owner: "current_period_teacher",
        scope: "institute",
        classTargets: [],
        sectionTargets: [],
        createdAt: "2026-08-01T00:00:00.000Z",
        createdBy: "Test",
      },
    ],
  });

  upsertSlotRegister(
    sampleRegister({
      id: "r-ma",
      date: "2026-07-14",
      slotId: "slot:morning",
      method: "morning_afternoon",
      configVersionId: "cfg-ma",
      slotKind: "morning",
      slotLabel: "Morning",
      absentIds: ["s-absent"],
      leaveIds: [],
    }),
  );
  upsertSlotRegister(
    sampleRegister({
      id: "r-ma-pm",
      date: "2026-07-14",
      slotId: "slot:afternoon",
      method: "morning_afternoon",
      configVersionId: "cfg-ma",
      slotKind: "afternoon",
      slotLabel: "Afternoon",
      absentIds: [],
      leaveIds: [],
    }),
  );
  upsertSlotRegister(
    sampleRegister({
      id: "r-p",
      date: "2026-09-10",
      slotId: "slot:period:1",
      method: "period_wise",
      configVersionId: "cfg-period",
      slotKind: "period",
      slotLabel: "P2 · Math",
      absentIds: ["s-absent"],
      leaveIds: ["s-leave"],
    }),
  );

  // 1) Config append must not touch registers
  const untouched = assertRegistersUntouchedBy(() => {
    appendAttendanceConfig({
      effectiveFrom: "2026-10-01",
      method: "daily",
      owner: "attendance_incharge",
      scope: "institute",
      createdBy: "Test",
    });
  });
  results.push({
    id: "config-change-preserves-registers",
    passed: untouched.ok,
    detail: untouched.ok
      ? `OK · ${untouched.before} registers unchanged after config append`
      : `FAIL · registers mutated ${untouched.before} → ${untouched.after}`,
  });

  // 2) July day still resolves as morning_afternoon from frozen registers
  const july = resolveHistoricalDay("10::B", "2026-07-14");
  results.push({
    id: "july-frozen-morning-afternoon",
    passed:
      july.method === "morning_afternoon" && july.methodFrozenFromRegisters,
    detail: `method=${july.method} frozen=${july.methodFrozenFromRegisters}`,
  });

  // 3) September day resolves period_wise from frozen registers
  const sept = resolveHistoricalDay("10::B", "2026-09-10");
  results.push({
    id: "sept-frozen-period-wise",
    passed: sept.method === "period_wise" && sept.methodFrozenFromRegisters,
    detail: `method=${sept.method} frozen=${sept.methodFrozenFromRegisters}`,
  });

  // 4) Report across method change: working days + % use frozen methods
  const report = buildAttendanceHistoryReport({
    from: "2026-07-14",
    to: "2026-09-10",
    sectionKey: "10::B",
    studentIds: ["s-present", "s-absent", "s-leave"],
    holidayDates: [],
  });
  const hasMaSegment = report.methodSegments.some(
    (s) => s.method === "morning_afternoon",
  );
  const hasPeriodSegment = report.methodSegments.some(
    (s) => s.method === "period_wise",
  );
  results.push({
    id: "report-method-segments",
    passed: hasMaSegment && hasPeriodSegment && report.workingDays > 0,
    detail: `workingDays=${report.workingDays} pct=${report.attendancePct} segments=${report.methodSegments.map((s) => s.method).join(",")}`,
  });

  // 5) Re-saving July morning with a different method must keep frozen method
  const resaved = upsertSlotRegister(
    sampleRegister({
      id: "r-ma-attempt-rewrite",
      date: "2026-07-14",
      slotId: "slot:morning",
      method: "period_wise",
      configVersionId: "cfg-period",
      slotKind: "period",
      slotLabel: "Hacked",
      absentIds: ["s-absent", "s-present"],
    }),
  );
  results.push({
    id: "resave-keeps-frozen-method",
    passed:
      resaved.method === "morning_afternoon" &&
      resaved.configVersionId === "cfg-ma",
    detail: `method=${resaved.method} config=${resaved.configVersionId}`,
  });

  const passed = results.filter((r) => r.passed).length;
  return { passed, failed: results.length - passed, results };
}

export function formatAttendanceHistoryVerificationReport(): string {
  const run = runAttendanceHistoryVerification();
  return [
    "# Attendance History Verification",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `**Result:** ${run.failed === 0 ? "PASS" : "FAIL"} · ${run.passed} passed · ${run.failed} failed`,
    "",
    "| Case | Status | Detail |",
    "|------|--------|--------|",
    ...run.results.map(
      (r) => `| \`${r.id}\` | ${r.passed ? "PASS" : "FAIL"} | ${r.detail} |`,
    ),
    "",
  ].join("\n");
}
