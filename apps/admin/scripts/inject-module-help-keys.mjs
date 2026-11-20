import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const adminRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const srcRoot = path.join(adminRoot, "src");

const rules = [
  [/routes[/\\]send\.tsx$/, "send"],
  [/routes[/\\]messages\.tsx$/, "messages"],
  [/routes[/\\]notifications\.tsx$/, "notifications"],
  [/routes[/\\]announcements\.tsx$/, "announcements"],
  [/routes[/\\]alerts\.tsx$/, "alerts"],
  [/routes[/\\]complaints\.tsx$/, "complaints"],
  [/routes[/\\]students\.index\.tsx$/, "students"],
  [/routes[/\\]students\.\$id\.tsx$/, "students"],
  [/components[/\\]students[/\\]/, "students"],
  [/routes[/\\]teachers\.tsx$/, "teachers"],
  [/routes[/\\]photos\.tsx$/, "photos"],
  [/routes[/\\]parents\.index\.tsx$/, "parents"],
  [/routes[/\\]parents\.\$id\.tsx$/, "parents"],
  [/components[/\\]parents[/\\]/, "parents"],
  [/routes[/\\]accounts\.tsx$/, "accounts"],
  [/routes[/\\]classes\.index\.tsx$/, "classes"],
  [/routes[/\\]classes\.\$id\.tsx$/, "classes"],
  [/components[/\\]classes[/\\]/, "classes"],
  [/routes[/\\]enrollments\.tsx$/, "enrollments"],
  [/routes[/\\]academic-management\.tsx$/, "academic-management"],
  [/routes[/\\]subjects\.tsx$/, "subjects"],
  [/routes[/\\]subjects\.\$id\.tsx$/, "subjects"],
  [/components[/\\]subjects[/\\]/, "subjects"],
  [/routes[/\\]timetable\.tsx$/, "timetable"],
  [/components[/\\]timetable[/\\]/, "timetable"],
  [/routes[/\\]student-attendance\.tsx$/, "student-attendance"],
  [/routes[/\\]attendance\.tsx$/, "attendance"],
  [/routes[/\\]teacher-attendance\.tsx$/, "teacher-attendance"],
  [/routes[/\\]exams\.tsx$/, "exams"],
  [/routes[/\\]marks\.tsx$/, "marks"],
  [/routes[/\\]homework\.tsx$/, "homework"],
  [/routes[/\\]diary\.tsx$/, "diary"],
  [/routes[/\\]permissions\.tsx$/, "permissions"],
  [/components[/\\]RolesAccessPage\.tsx$/, "permissions"],
  [/routes[/\\]subscription\.tsx$/, "subscription"],
  [/routes[/\\]modules\.tsx$/, "modules"],
  [/routes[/\\]storage\.tsx$/, "storage"],
  [/routes[/\\]transport\.tsx$/, "transport"],
  [/routes[/\\]leave\.tsx$/, "leave"],
  [/routes[/\\]fees\.tsx$/, "fees"],
  [/routes[/\\]admissions\.tsx$/, "admissions"],
  [/routes[/\\]careers\.tsx$/, "careers"],
  [/routes[/\\]templates\.tsx$/, "templates"],
  [/routes[/\\]documents\.tsx$/, "documents"],
  [/routes[/\\]calendar\.tsx$/, "calendar"],
  [/routes[/\\]events\.tsx$/, "events"],
  [/routes[/\\]reports\.tsx$/, "reports"],
  [/routes[/\\]teacher-performance\.tsx$/, "teacher-performance"],
  [/routes[/\\]settings\.tsx$/, "settings"],
  [/routes[/\\]profile-settings\.tsx$/, "profile-settings"],
  [/routes[/\\]institute\.tsx$/, "institute"],
  [/components[/\\]institute[/\\]/, "institute"],
  [/routes[/\\]setup\.tsx$/, "setup"],
];

function mapFile(rel) {
  for (const [re, key] of rules) {
    if (re.test(rel)) return key;
  }
  return null;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

let updated = 0;
for (const file of walk(srcRoot)) {
  const rel = path.relative(srcRoot, file);
  const key = mapFile(rel);
  if (!key) continue;
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes("<ModuleHero")) continue;
  const before = src;
  src = src.replace(/<ModuleHero\b([^>]*?)>/gs, (full, attrs) => {
    if (/\bhelpKey\s*=/.test(attrs)) return full;
    const trimmed = attrs.trimEnd();
    if (trimmed.endsWith("/")) {
      return `<ModuleHero${trimmed.slice(0, -1)} helpKey="${key}" />`;
    }
    return `<ModuleHero${attrs} helpKey="${key}">`;
  });
  if (src !== before) {
    fs.writeFileSync(file, src);
    updated += 1;
    console.log("updated", rel, "->", key);
  }
}
console.log("files updated", updated);
