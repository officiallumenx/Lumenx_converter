import { writeFileSync } from "node:fs";
import {
  formatAttendanceWorkflowVerificationReport,
  runAttendanceWorkflowVerification,
} from "../src/verify.ts";

const run = runAttendanceWorkflowVerification();
console.log(JSON.stringify(run, null, 2));
const report = formatAttendanceWorkflowVerificationReport();
writeFileSync(
  new URL("../../../docs/ATTENDANCE_WORKFLOW_VERIFICATION.md", import.meta.url),
  report,
  "utf8",
);
console.log("Wrote docs/ATTENDANCE_WORKFLOW_VERIFICATION.md");
