import { writeFileSync } from "node:fs";
import {
  formatAttendanceHistoryVerificationReport,
  runAttendanceHistoryVerification,
} from "../src/history-verify.ts";

const run = runAttendanceHistoryVerification();
console.log(JSON.stringify(run, null, 2));
const report = formatAttendanceHistoryVerificationReport();
writeFileSync(
  new URL("../../../docs/ATTENDANCE_HISTORY_VERIFICATION.md", import.meta.url),
  report,
  "utf8",
);
console.log("Wrote docs/ATTENDANCE_HISTORY_VERIFICATION.md");
