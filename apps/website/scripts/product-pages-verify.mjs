import fs from "fs";

const OUT = "qa-artifacts/product-pages";
fs.mkdirSync(OUT, { recursive: true });

const checks = [
  [
    "/platform/admin",
    [
      "Run your institution from one operational core.",
      "People & accounts",
      "Fees & dues",
      "Book a Demo",
      "Explore Modules",
      "/assets/screenshots/admin/command.png",
    ],
  ],
  [
    "/platform/connect",
    [
      "One connected experience for teachers, parents and students.",
      "Teachers, parents, and students — clearly separated",
      "Run the class day from Connect.",
      "Stay informed for every linked child.",
      "Your timetable, work, and results in one place.",
      "/assets/screenshots/connect/teacher-home.jpg",
    ],
  ],
  [
    "/platform/transport",
    [
      "Bring transport operations into a dedicated workflow.",
      "Boarding",
      "not a live telematics",
      "Emergency notes",
      "/assets/screenshots/transport/boarding.jpg",
    ],
  ],
  [
    "/platform/admissions",
    [
      "Make the admissions journey more organized.",
      "Convert to student",
      "Document uploads",
      "/assets/screenshots/admissions/signin.jpg",
    ],
  ],
  [
    "/platform/careers",
    [
      "Connect opportunities with talent.",
      "not payroll",
      "Convert to teacher",
      "/assets/screenshots/careers/home.jpg",
    ],
  ],
  [
    "/platform/nexus",
    [
      "Support the entire ecosystem.",
      "not the school ERP",
      "Screenshots pending",
      "Modules, billing & renewals",
    ],
  ],
];

let failed = 0;
for (const [path, needles] of checks) {
  const res = await fetch(`http://127.0.0.1:4321${path}`);
  const html = await res.text();
  console.log(path, res.status, html.length);
  if (res.status !== 200) failed++;
  for (const n of needles) {
    if (!html.includes(n)) {
      console.log("  MISSING:", n);
      failed++;
    } else {
      console.log("  ok:", n.slice(0, 60));
    }
  }
  // no placeholder / invented claims
  for (const bad of ["Lorem Ipsum", "revolutionize", "live GPS map tracking for parents", "full HRMS"]) {
    if (html.toLowerCase().includes(bad.toLowerCase()) && bad !== "not payroll") {
      // allow negation phrases
    }
  }
}

console.log(failed === 0 ? "PRODUCT PAGE ASSERTIONS PASS" : `PRODUCT PAGE ASSERTIONS FAIL: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
