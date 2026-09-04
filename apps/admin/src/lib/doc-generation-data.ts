// ─── Types ────────────────────────────────────────────────────────────────────

export type GenerateScope = "single" | "multiple" | "class" | "grade" | "school";

export type DemoStudent = {
  id: string;
  admissionNo: string;
  name: string;
  gender: "M" | "F";
  grade: number; // 6–12
  gradeLabel: string; // "VI"…"XII"
  section: string; // "A" | "B" | "C"
  classLabel: string; // "XII-A"
  rollNo: string;
  dob: string; // YYYY-MM-DD
  dateOfAdmission: string;
  academicYear: string; // "2025-26"
  parentName: string;
  bloodGroup: string;
};

export type GeneratedDraftEntry = {
  studentId: string;
  studentName: string;
  classLabel: string;
  admissionNo: string;
  certificateNumber: string;
  variables: Record<string, string>;
  overrides: Record<string, string>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADE_ROMAN: Record<number, string> = {
  6: "VI", 7: "VII", 8: "VIII", 9: "IX", 10: "X", 11: "XI", 12: "XII",
};

function s(
  id: string, admNo: string, name: string, gender: "M" | "F",
  grade: number, section: string, roll: string, dob: string,
  admission: string, parent: string, blood: string,
): DemoStudent {
  const gl = GRADE_ROMAN[grade];
  return {
    id, admissionNo: admNo, name, gender, grade, gradeLabel: gl,
    section, classLabel: `${gl}-${section}`, rollNo: roll,
    dob, dateOfAdmission: admission, academicYear: "2025-26",
    parentName: parent, bloodGroup: blood,
  };
}

// ─── Demo student roster (52 students, grades 6–12) ──────────────────────────

export const DEMO_STUDENTS: DemoStudent[] = [
  // ── Grade VI ───────────────────────────────────────────────────────────────
  s("STU-601","ADM/2024/601","Aryan Kapoor","M",6,"A","01","2013-04-12","2024-06-01","Rajiv Kapoor","B+"),
  s("STU-602","ADM/2024/602","Pooja Mehta","F",6,"A","02","2013-07-22","2024-06-01","Suresh Mehta","O+"),
  s("STU-603","ADM/2024/603","Nikhil Rao","M",6,"A","03","2013-09-03","2024-06-01","Vinod Rao","A+"),
  s("STU-604","ADM/2024/604","Sanya Sharma","F",6,"B","01","2013-02-18","2024-06-01","Deepak Sharma","AB+"),
  s("STU-605","ADM/2024/605","Rohit Joshi","M",6,"B","02","2013-11-25","2024-06-01","Naresh Joshi","O-"),
  s("STU-606","ADM/2024/606","Isha Patel","F",6,"B","03","2013-06-14","2024-06-01","Kiran Patel","B+"),
  // ── Grade VII ──────────────────────────────────────────────────────────────
  s("STU-701","ADM/2023/701","Aditya Singh","M",7,"A","01","2012-03-08","2023-06-01","Mohan Singh","A-"),
  s("STU-702","ADM/2023/702","Kavya Nair","F",7,"A","02","2012-08-16","2023-06-01","Rajan Nair","O+"),
  s("STU-703","ADM/2023/703","Siddharth Kumar","M",7,"A","03","2012-05-29","2023-06-01","Ajay Kumar","B+"),
  s("STU-704","ADM/2023/704","Ananya Reddy","F",7,"B","01","2012-12-01","2023-06-01","Srinivas Reddy","AB-"),
  s("STU-705","ADM/2023/705","Dev Verma","M",7,"B","02","2012-10-19","2023-06-01","Prashant Verma","O+"),
  s("STU-706","ADM/2023/706","Nisha Iyer","F",7,"B","03","2012-01-07","2023-06-01","Subramaniam Iyer","A+"),
  // ── Grade VIII ─────────────────────────────────────────────────────────────
  s("STU-801","ADM/2022/801","Arjun Nair","M",8,"A","01","2011-06-23","2022-06-01","Balan Nair","B+"),
  s("STU-802","ADM/2022/802","Meera Krishnan","F",8,"A","02","2011-03-14","2022-06-01","Krishnan P","O+"),
  s("STU-803","ADM/2022/803","Kabir Verma","M",8,"B","01","2011-09-30","2022-06-01","Ramesh Verma","A+"),
  s("STU-804","ADM/2022/804","Tanya Dubey","F",8,"B","02","2011-11-11","2022-06-01","Prakash Dubey","AB+"),
  s("STU-805","ADM/2022/805","Vivek Pillai","M",8,"A","03","2011-07-04","2022-06-01","Suresh Pillai","O-"),
  s("STU-806","ADM/2022/806","Priya Nambiar","F",8,"B","03","2011-02-28","2022-06-01","George Nambiar","B-"),
  // ── Grade IX ───────────────────────────────────────────────────────────────
  s("STU-901","ADM/2021/901","Priya Singh","F",9,"A","01","2010-04-17","2021-06-01","Harinder Singh","A+"),
  s("STU-902","ADM/2021/902","Rohan Gupta","M",9,"A","02","2010-08-25","2021-06-01","Sunil Gupta","O+"),
  s("STU-903","ADM/2021/903","Lakshmi Suresh","F",9,"A","03","2010-06-09","2021-06-01","T Suresh","B+"),
  s("STU-904","ADM/2021/904","Harsh Tiwari","M",9,"B","01","2010-12-31","2021-06-01","Dinesh Tiwari","AB+"),
  s("STU-905","ADM/2021/905","Divya Menon","F",9,"B","02","2010-03-22","2021-06-01","Ajith Menon","O+"),
  s("STU-906","ADM/2021/906","Kunal Sharma","M",9,"B","03","2010-10-05","2021-06-01","Vikas Sharma","B+"),
  // ── Grade X ────────────────────────────────────────────────────────────────
  s("STU-1001","ADM/2020/001","Ananya Patel","F",10,"A","01","2009-05-14","2020-06-01","Jitendra Patel","A+"),
  s("STU-1002","ADM/2020/002","Vivek Rajan","M",10,"A","02","2009-09-03","2020-06-01","Rajan M","O-"),
  s("STU-1003","ADM/2020/003","Sneha Das","F",10,"A","03","2009-07-27","2020-06-01","Kamal Das","B+"),
  s("STU-1004","ADM/2020/004","Aakash Mehta","M",10,"B","01","2009-02-14","2020-06-01","Ramesh Mehta","AB+"),
  s("STU-1005","ADM/2020/005","Riya Nair","F",10,"B","02","2009-11-30","2020-06-01","Nair K T","O+"),
  s("STU-1006","ADM/2020/006","Sayan Roy","M",10,"B","03","2009-04-18","2020-06-01","Tapan Roy","A-"),
  // ── Grade XI ───────────────────────────────────────────────────────────────
  s("STU-1101","ADM/2019/101","Rohan Mehta","M",11,"A","01","2008-03-06","2019-06-01","Suresh Mehta","B+"),
  s("STU-1102","ADM/2019/102","Sneha Gupta","F",11,"A","02","2008-07-19","2019-06-01","Vinay Gupta","O+"),
  s("STU-1103","ADM/2019/103","Arjun Dev","M",11,"A","03","2008-11-22","2019-06-01","Dev R","A+"),
  s("STU-1104","ADM/2019/104","Kritika Sharma","F",11,"B","01","2008-01-08","2019-06-01","Sanjay Sharma","AB-"),
  s("STU-1105","ADM/2019/105","Varun Pillai","M",11,"B","02","2008-09-15","2019-06-01","Rajan Pillai","O+"),
  s("STU-1106","ADM/2019/106","Meghna Iyer","F",11,"B","03","2008-05-03","2019-06-01","Iyer S K","B-"),
  // ── Grade XII ──────────────────────────────────────────────────────────────
  s("STU-1201","ADM/2018/201","Aarav Sharma","M",12,"A","01","2007-08-15","2018-06-01","Rakesh Sharma","A+"),
  s("STU-1202","ADM/2018/202","Diya Iyer","F",12,"A","02","2007-04-21","2018-06-01","Krishnaswamy Iyer","O+"),
  s("STU-1203","ADM/2018/203","Vikram Sen","M",12,"A","03","2007-12-09","2018-06-01","Subir Sen","B+"),
  s("STU-1204","ADM/2018/204","Ananya Joshi","F",12,"B","01","2007-06-30","2018-06-01","Mukesh Joshi","AB+"),
  s("STU-1205","ADM/2018/205","Rahul Nair","M",12,"B","02","2007-03-17","2018-06-01","Nair V P","O-"),
  s("STU-1206","ADM/2018/206","Priyanka Das","F",12,"B","03","2007-10-24","2018-06-01","Partha Das","A+"),
];

// ─── Grouped helpers ──────────────────────────────────────────────────────────

/** All unique grades (sorted ascending) */
export const AVAILABLE_GRADES: number[] = [6, 7, 8, 9, 10, 11, 12];

/** Unique class labels, e.g. ["VI-A", "VI-B", ...] */
export const AVAILABLE_CLASSES: string[] = Array.from(
  new Set(DEMO_STUDENTS.map((s) => s.classLabel)),
).sort((a, b) => {
  const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
  const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
  return numA - numB || a.localeCompare(b);
});

export function studentsForScope(
  scope: GenerateScope,
  opts: { studentIds?: string[]; classLabel?: string; grade?: number },
): DemoStudent[] {
  switch (scope) {
    case "single":
    case "multiple":
      return DEMO_STUDENTS.filter((s) => opts.studentIds?.includes(s.id));
    case "class":
      return DEMO_STUDENTS.filter((s) => s.classLabel === opts.classLabel);
    case "grade":
      return DEMO_STUDENTS.filter((s) => s.grade === opts.grade);
    case "school":
      return [...DEMO_STUDENTS];
  }
}

// ─── Variable resolution ─────────────────────────────────────────────────────

const INSTITUTE_NAME = "Test1School";
const INSTITUTE_PRINCIPAL = "Dr. Ramesh Kumar";

/** Return all known variable values for a student. */
export function buildVariableMap(student: DemoStudent, issueDate: string): Record<string, string> {
  return {
    StudentName: student.name,
    AdmissionNumber: student.admissionNo,
    Class: student.classLabel,
    Section: student.section,
    Grade: student.gradeLabel,
    RollNumber: student.rollNo,
    DateOfBirth: student.dob,
    DateOfAdmission: student.dateOfAdmission,
    AcademicYear: student.academicYear,
    ParentName: student.parentName,
    BloodGroup: student.bloodGroup,
    Gender: student.gender === "M" ? "Male" : "Female",
    IssueDate: issueDate,
    InstituteName: INSTITUTE_NAME,
    PrincipalName: INSTITUTE_PRINCIPAL,
  };
}

/** Replace {{Key}} tokens in a string with resolved values (merged with overrides). */
export function resolveText(
  text: string,
  vars: Record<string, string>,
  overrides: Record<string, string> = {},
): string {
  const merged = { ...vars, ...overrides };
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => merged[key] ?? `{{${key}}}`);
}

/** Generate a certificate / document number. */
export function generateDocNumber(prefix: string, index: number): string {
  const year = new Date().getFullYear();
  const seq = String(index + 1).padStart(4, "0");
  return `${prefix}${year}/${seq}`;
}

// ─── Variable catalogue (for the Override UI) ────────────────────────────────

export type VariableCatalogEntry = {
  key: string;
  label: string;
  category: "student" | "institute" | "meta";
};

export const VARIABLE_CATALOGUE: VariableCatalogEntry[] = [
  { key: "StudentName", label: "Student name", category: "student" },
  { key: "AdmissionNumber", label: "Admission number", category: "student" },
  { key: "Class", label: "Class", category: "student" },
  { key: "Section", label: "Section", category: "student" },
  { key: "Grade", label: "Grade (Roman)", category: "student" },
  { key: "RollNumber", label: "Roll number", category: "student" },
  { key: "DateOfBirth", label: "Date of birth", category: "student" },
  { key: "DateOfAdmission", label: "Date of admission", category: "student" },
  { key: "AcademicYear", label: "Academic year", category: "student" },
  { key: "ParentName", label: "Parent / guardian name", category: "student" },
  { key: "BloodGroup", label: "Blood group", category: "student" },
  { key: "Gender", label: "Gender", category: "student" },
  { key: "IssueDate", label: "Issue date", category: "meta" },
  { key: "InstituteName", label: "Institute name", category: "institute" },
  { key: "PrincipalName", label: "Principal name", category: "institute" },
];

/** Extract which {{keys}} appear in a block of text. */
export function extractUsedVariables(text: string): string[] {
  const matches = [...text.matchAll(/\{\{(\w+)\}\}/g)];
  return [...new Set(matches.map((m) => m[1]))];
}
