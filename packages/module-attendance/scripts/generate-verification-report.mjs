import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatAttendanceWorkflowVerificationReport } from "../src/verify.ts";

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, "../../../docs/ATTENDANCE_WORKFLOW_VERIFICATION.md");
const report = formatAttendanceWorkflowVerificationReport();
writeFileSync(out, report, "utf8");
console.log(report);
console.log(`\nWrote ${out}`);
