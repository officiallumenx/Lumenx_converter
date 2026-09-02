/**
 * Fix @/lib/* imports broken by /careers/ path stripping during extraction.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src");

const REPLACEMENTS = [
  ['from "@/lib/recruiter-jobs-store"', 'from "@/lib/careers/recruiter-jobs-store"'],
  ['from "@/lib/recruiter-talent"', 'from "@/lib/careers/recruiter-talent"'],
  ['from "@/lib/jobs-data"', 'from "@/lib/careers/jobs-data"'],
  ['from "@/lib/profile-repository"', 'from "@/lib/careers/profile-repository"'],
  ['from "@/lib/apply-utils"', 'from "@/lib/careers/apply-utils"'],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.tsx?$/.test(entry.name)) {
      let content = fs.readFileSync(full, "utf8");
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (content.includes(from)) {
          content = content.split(from).join(to);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content);
    }
  }
}

walk(ROOT);
console.log("Fixed careers lib import paths.");
