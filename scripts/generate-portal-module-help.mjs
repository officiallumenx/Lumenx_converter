/**
 * One-shot generator: portal module-help registries + inject helpKey props.
 * Run from repo root: node scripts/generate-portal-module-help.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function entry(id, title, whatIs, whatYouCanDo, howToUse) {
  return { id, title, whatIs, whatYouCanDo, howToUse };
}

function help(id, title, focus) {
  return entry(
    id,
    title,
    `${title} is where you ${focus}. Use this screen to stay on top of the related tasks in LumenX.`,
    [
      `View the latest ${title.toLowerCase()} information`,
      `Take the actions available for ${title.toLowerCase()}`,
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    [
      `Open ${title} from the navigation.`,
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  );
}

function writeRegistry(appRel, entries, requiredIds) {
  const dir = path.join(root, appRel, "src/lib/module-help");
  fs.mkdirSync(dir, { recursive: true });
  const body = entries
    .map((e) => {
      const wyc = e.whatYouCanDo.map((s) => `      ${JSON.stringify(s)},`).join("\n");
      const htu = e.howToUse.map((s) => `      ${JSON.stringify(s)},`).join("\n");
      return `  ${JSON.stringify(e.id)}: {
    id: ${JSON.stringify(e.id)},
    title: ${JSON.stringify(e.title)},
    whatIs:
      ${JSON.stringify(e.whatIs)},
    whatYouCanDo: [
${wyc}
    ],
    howToUse: [
${htu}
    ],
  },`;
    })
    .join("\n");

  const registrySrc = `import {
  createGetModuleHelp,
  normalizeModuleHelpKey,
  type ModuleHelpContent,
  type ModuleHelpRegistry,
} from "@lumenx/module-help";

const _registry: Record<string, ModuleHelpContent> = {
${body}
};

export const MODULE_HELP_REGISTRY: ModuleHelpRegistry = _registry;

export const MODULE_HELP_REQUIRED_IDS = ${JSON.stringify(requiredIds, null, 2)} as const;

export { normalizeModuleHelpKey };
export const getModuleHelp = createGetModuleHelp(MODULE_HELP_REGISTRY);
`;
  fs.writeFileSync(path.join(dir, "registry.ts"), registrySrc);
  fs.writeFileSync(
    path.join(dir, "index.ts"),
    `export {
  MODULE_HELP_REGISTRY,
  MODULE_HELP_REQUIRED_IDS,
  getModuleHelp,
  normalizeModuleHelpKey,
} from "./registry";
`,
  );

  const testSrc = `import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MODULE_HELP_REQUIRED_IDS,
  getModuleHelp,
  normalizeModuleHelpKey,
} from "./registry";

const srcRoot = path.resolve(import.meta.dirname, "../..");

describe("module-help registry coverage", () => {
  it("has complete content for every required id", () => {
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const help = getModuleHelp(id);
      expect(help, id).toBeTruthy();
      expect(help?.id).toBe(id);
      expect(help?.title.trim().length).toBeGreaterThan(0);
      expect(help?.whatIs.trim().length).toBeGreaterThan(20);
      expect(help?.whatYouCanDo.length).toBeGreaterThanOrEqual(2);
      expect(help?.howToUse.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("accepts path-like keys", () => {
    const sample = MODULE_HELP_REQUIRED_IDS[0];
    expect(getModuleHelp(\`/\${sample}\`)?.id).toBe(sample);
    expect(normalizeModuleHelpKey(\`/\${sample}\`)).toBe(sample);
  });

  it("wires helpKey in source for required modules", () => {
    const missing: string[] = [];
    for (const id of MODULE_HELP_REQUIRED_IDS) {
      const bare = normalizeModuleHelpKey(id);
      const re = new RegExp(\`helpKey\\\\s*=\\\\s*['"]\${bare}['"]\`);
      let found = false;
      const stack = [srcRoot];
      while (stack.length && !found) {
        const dir = stack.pop();
        if (!dir) break;
        for (const name of fs.readdirSync(dir)) {
          const p = path.join(dir, name);
          const st = fs.statSync(p);
          if (st.isDirectory()) {
            if (name === "node_modules" || name === "dist") continue;
            stack.push(p);
          } else if (name.endsWith(".tsx") || name.endsWith(".ts")) {
            const text = fs.readFileSync(p, "utf8");
            if (re.test(text)) {
              found = true;
              break;
            }
          }
        }
      }
      if (!found) missing.push(id);
    }
    expect(missing, \`missing helpKey for: \${missing.join(", ")}\`).toEqual([]);
  });
});
`;
  fs.writeFileSync(path.join(dir, "registry.coverage.test.ts"), testSrc);
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      walk(p, out);
    } else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function injectHelpKeys(appRel, componentNames, rules) {
  const srcRoot = path.join(root, appRel, "src");
  let updated = 0;
  for (const file of walk(srcRoot)) {
    const rel = path.relative(srcRoot, file).replace(/\\/g, "/");
    let key = null;
    for (const [re, k] of rules) {
      if (re.test(rel)) {
        key = k;
        break;
      }
    }
    if (!key) continue;
    let src = fs.readFileSync(file, "utf8");
    const before = src;
    for (const name of componentNames) {
      const tagRe = new RegExp(`<${name}\\b([^>]*?)(/?)>`, "gs");
      src = src.replace(tagRe, (full, attrs, selfClose) => {
        if (/\bhelpKey\s*=/.test(attrs)) return full;
        const trimmed = attrs.trimEnd();
        if (selfClose || trimmed.endsWith("/")) {
          const base = selfClose ? trimmed : trimmed.slice(0, -1);
          return `<${name}${base} helpKey="${key}" />`;
        }
        return `<${name}${attrs} helpKey="${key}">`;
      });
    }
    if (src !== before) {
      fs.writeFileSync(file, src);
      updated += 1;
      console.log("updated", appRel, rel, "->", key);
    }
  }
  console.log(appRel, "files updated", updated);
}

// ——— Connect ———
const connectEntries = [
  help("home", "Home", "see today's school overview and shortcuts"),
  help("attendance", "Attendance", "check present/absent status"),
  help("transport", "Transport", "follow bus and trip updates"),
  help("assignments", "Homework", "view and submit assignments"),
  help("marks", "Marks", "review scores and report cards"),
  help("diary", "Class Diary", "read daily class notes and homework notes"),
  help("timetable", "Timetable", "see the class schedule"),
  help("exams", "Exams", "track upcoming exams and results"),
  help("alerts", "Alerts", "read urgent school alerts"),
  help("notifications", "Notifications", "catch up on app notifications"),
  help("announcements", "Announcements", "read school announcements"),
  help("messages", "Messages", "chat with teachers and school staff"),
  help("academic-history", "Academic History", "review past academic records"),
  help("achievements", "Achievements", "see awards and milestones"),
  help("growth", "Growth", "follow learning progress insights"),
  help("events", "Events", "browse school events and calendars"),
  help("fees", "Fees", "view fee dues and payment status"),
  help("activities", "Activities", "explore sports and co-curricular work"),
  help("teachers", "Teachers", "see assigned teachers and contacts"),
  help("certificates", "Certificates", "access issued certificates"),
  help("id-card", "ID Card", "view or download the digital ID card"),
  help("complaints", "Complaints", "raise or track complaints"),
  help("leave", "Leave", "request or approve leave"),
  help("students", "Students", "browse your class student directory"),
  help("classes", "My Classes", "manage the classes you teach"),
  help("remarks", "Remarks", "add or review student remarks"),
  help("profile", "Profile & Settings", "manage your Connect profile and preferences"),
  help("activity", "Activity Home", "run the activity workspace overview"),
  help("activity-sports", "Sports", "manage sports groups and sessions"),
  help("activity-extra-curricular", "Extra-curricular", "manage ECA groups and plans"),
  help("activity-attendance", "Activity Attendance", "mark activity attendance"),
  help("activity-diary", "Activity Diary", "log activity notes"),
  help("activity-achievements", "Activity Achievements", "record activity achievements"),
  help("activity-messages", "Activity Messages", "message activity members"),
  help("activity-notifications", "Activity Notifications", "read activity notifications"),
  help("activity-announcements", "Activity Announcements", "post or read activity announcements"),
  help("activity-practice", "Practice", "plan and track practice sessions"),
  help("activity-calendar", "Activity Calendar", "see the activity calendar"),
  help("activity-profile", "Activity Profile", "manage activity workspace profile settings"),
];
writeRegistry(
  "apps/connect",
  connectEntries,
  connectEntries.map((e) => e.id),
);

injectHelpKeys(
  "apps/connect",
  ["PageHeader", "ActivitySectionHeader"],
  [
    [/activity-workspace[/\\]features[/\\]sports/, "activity-sports"],
    [/activity-workspace[/\\]features[/\\]extra-curricular/, "activity-extra-curricular"],
    [/activity-workspace[/\\]features[/\\]attendance/, "activity-attendance"],
    [/activity-workspace[/\\]features[/\\]diary/, "activity-diary"],
    [/activity-workspace[/\\]features[/\\]achievements/, "activity-achievements"],
    [/activity-workspace[/\\]features[/\\]messages/, "activity-messages"],
    [/activity-workspace[/\\]features[/\\]notifications/, "activity-notifications"],
    [/activity-workspace[/\\]features[/\\]announcements/, "activity-announcements"],
    [/activity-workspace[/\\]features[/\\]practice/, "activity-practice"],
    [/activity-workspace[/\\]features[/\\]calendar/, "activity-calendar"],
    [/activity-workspace[/\\]features[/\\]profile/, "activity-profile"],
    [/activity-workspace[/\\]features[/\\]communication/, "activity-messages"],
    [/activity-workspace[/\\].*[/\\](Home|ActivityHome|index)/i, "activity"],
    [/routes[/\\]_authenticated[/\\]attendance/, "attendance"],
    [/attendance[/\\]/, "attendance"],
    [/transport[/\\]/, "transport"],
    [/routes[/\\]_authenticated[/\\]transport/, "transport"],
    [/assignments|homework/i, "assignments"],
    [/marks[/\\]|MarksPage/, "marks"],
    [/diary[/\\]/, "diary"],
    [/timetable/, "timetable"],
    [/exams[/\\]|ExamsPage/, "exams"],
    [/alerts[/\\]/, "alerts"],
    [/notifications/, "notifications"],
    [/announcements/, "announcements"],
    [/messages/, "messages"],
    [/academic-history/, "academic-history"],
    [/achievements/, "achievements"],
    [/growth|GrowthPage/, "growth"],
    [/events/, "events"],
    [/fees|FeesPage/, "fees"],
    [/activities/, "activities"],
    [/teachers/, "teachers"],
    [/certificates/, "certificates"],
    [/id-card/, "id-card"],
    [/complaints|ComplaintsPage/, "complaints"],
    [/leave[/\\]/, "leave"],
    [/students[/\\]/, "students"],
    [/classes[/\\]/, "classes"],
    [/remarks[/\\]/, "remarks"],
    [/profile[/\\]/, "profile"],
    [/routes[/\\]_authenticated[/\\]index/, "home"],
    [/HomePage|DashboardPage|LearnerHome/, "home"],
  ],
);

// ——— Transport ———
const transportEntries = [
  help("home", "Home", "start trips and see today's transport overview"),
  help("attendance", "Attendance", "mark student boarding and attendance"),
  help("alerts", "Alerts", "read transport alerts and notifications"),
  help("emergency", "Emergency", "raise or follow emergency protocols"),
  help("more", "More", "open additional transport tools"),
  help("bus-information", "Bus Information", "review bus, route, and stop details"),
  help("route-setup", "Route Setup", "add stops and assign students for approval"),
  help("profile", "Profile", "manage your driver profile"),
  help("settings", "Settings", "adjust Transport app preferences"),
  help("support", "Support", "get help with the Transport app"),
];
writeRegistry(
  "apps/transport",
  transportEntries,
  transportEntries.map((e) => e.id),
);
injectHelpKeys(
  "apps/transport",
  ["SectionHeader", "FeatureHero"],
  [
    [/features[/\\]home/, "home"],
    [/features[/\\]attendance/, "attendance"],
    [/features[/\\]notifications/, "alerts"],
    [/features[/\\]emergency/, "emergency"],
    [/routes[/\\]_app[/\\]more[/\\]index/, "more"],
    [/bus-information/, "bus-information"],
    [/route-setup/, "route-setup"],
    [/more[/\\]profile|features[/\\]profile/, "profile"],
    [/more[/\\]settings|features[/\\]settings/, "settings"],
    [/more[/\\]support|features[/\\]support/, "support"],
  ],
);

// ——— Careers ———
const careersEntries = [
  help("home", "Careers Home", "explore LumenX Careers and start job seeking or hiring"),
  help("jobs", "Jobs", "browse open roles"),
  help("dashboard", "Dashboard", "see your careers overview"),
  help("applications", "Applications", "track job applications"),
  help("apply", "Apply", "start or continue a job application"),
  help("saved", "Saved jobs", "revisit roles you saved"),
  help("interviews", "Interviews", "manage interview schedules"),
  help("documents", "Documents", "upload resumes and supporting files"),
  help("notifications", "Notifications", "read careers notifications"),
  help("profile", "Profile", "edit your careers profile"),
  help("settings", "Settings", "manage careers account settings"),
  help("recruiter", "Recruiter workspace", "run hiring from your recruiter home"),
  help("recruiter-jobs", "My jobs", "create and manage job postings"),
  help("recruiter-applicants", "Applicants", "review candidates for your roles"),
  help("recruiter-talent", "Discover talent", "search the talent pool"),
  help("job-detail", "Job details", "read a role and apply or manage it"),
  help("application-detail", "Application details", "review one application end to end"),
];
writeRegistry(
  "apps/careers",
  careersEntries,
  careersEntries.map((e) => e.id),
);
injectHelpKeys(
  "apps/careers",
  ["CareersPageHeader"],
  [
    [/recruiter[/\\].*talent|Talent/, "recruiter-talent"],
    [/recruiter[/\\].*applicant|Applicants/, "recruiter-applicants"],
    [/recruiter[/\\].*jobs|RecruiterJobs|JobEditor|JobNew/, "recruiter-jobs"],
    [/recruiter[/\\]|RecruiterHome|RecruiterWorkspace/, "recruiter"],
    [/application.*detail|ApplicationDetail/i, "application-detail"],
    [/job.*detail|JobDetail/i, "job-detail"],
    [/applications/, "applications"],
    [/apply/, "apply"],
    [/saved/, "saved"],
    [/interviews/, "interviews"],
    [/documents/, "documents"],
    [/notifications/, "notifications"],
    [/profile/, "profile"],
    [/settings/, "settings"],
    [/dashboard/, "dashboard"],
    [/jobs/, "jobs"],
    [/HomePage|careers-portal[/\\].*home/i, "home"],
  ],
);

// ——— Admissions ———
const admissionsEntries = [
  help("home", "Admissions Home", "start exploring institutes and applications"),
  help("institutes", "Institutes", "browse institutes accepting applications"),
  help("programs", "Programs", "explore academic programs"),
  help("dashboard", "Dashboard", "see your admissions overview"),
  help("apply", "Apply", "start or continue an application"),
  help("applications", "Applications", "track submitted applications"),
  help("documents", "Documents", "upload admission documents"),
  help("inquiries", "Inquiries", "ask institutes questions"),
  help("notifications", "Notifications", "read admissions notifications"),
  help("faq", "FAQs", "find answers to common admissions questions"),
  help("contact", "Contact", "reach admissions support"),
  help("profile", "Profile", "manage your applicant profile"),
  help("settings", "Settings", "adjust admissions preferences"),
  help("institute", "Institute dashboard", "run your institute admissions workspace"),
  help("institute-applications", "Institute applications", "review incoming applications"),
  help("institute-openings", "Openings", "publish and manage admission openings"),
  help("institute-form", "Application form", "configure the application form"),
  help("institute-profile", "Institute profile", "edit your institute public profile"),
  help("institute-settings", "Institute settings", "manage institute admissions settings"),
];
writeRegistry(
  "apps/admissions",
  admissionsEntries,
  admissionsEntries.map((e) => e.id),
);
injectHelpKeys(
  "apps/admissions",
  ["AdmissionsPageHeader"],
  [
    [/institute-admin[/\\].*Applications|institute[/\\]applications/, "institute-applications"],
    [/institute-admin[/\\].*Openings|institute[/\\]openings/, "institute-openings"],
    [/institute-admin[/\\].*Form|institute[/\\]form/, "institute-form"],
    [/institute-admin[/\\].*Profile|institute[/\\]profile/, "institute-profile"],
    [/institute[/\\]settings|InstituteSettings/, "institute-settings"],
    [/institute-admin|InstituteDashboard|routes[/\\].*institute[/\\]index/, "institute"],
    [/institutes/, "institutes"],
    [/programs/, "programs"],
    [/applications/, "applications"],
    [/apply/, "apply"],
    [/documents/, "documents"],
    [/inquiries/, "inquiries"],
    [/notifications/, "notifications"],
    [/faq|Faq|FAQ/, "faq"],
    [/contact/, "contact"],
    [/profile/, "profile"],
    [/settings/, "settings"],
    [/dashboard/, "dashboard"],
    [/HomePage|routes[/\\]index/, "home"],
  ],
);

console.log("done");
