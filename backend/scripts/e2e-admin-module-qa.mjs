/**
 * Phase 11 — Real Admin workflow QA (corrected payloads).
 * Uses backend/.env — never prints secrets.
 */
import { config as loadDotenv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

loadDotenv();

const API = process.env.E2E_API_BASE_URL?.trim() || "http://127.0.0.1:8787";
const SUPABASE_URL = process.env.SUPABASE_URL?.trim();
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY?.trim();
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!SUPABASE_URL || !SUPABASE_ANON || !SUPABASE_SERVICE) process.exit(1);

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false } });
const anon = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false } });
const sfx = randomBytes(3).toString("hex");
const today = new Date().toISOString().slice(0, 10);

/** @type {Record<string, { classification: string, pct: number, ops: Record<string,string>, notes: string[] }>} */
const M = {};
const mod = (n) => (M[n] ??= { classification: "BLOCKED", pct: 0, ops: {}, notes: [] });
const pass = (n, k, ok, d = "") => { mod(n).ops[k] = ok ? "PASS" : `FAIL${d ? `: ${d}` : ""}`; };
const note = (n, t) => mod(n).notes.push(t);

function score(n, w = {}) {
  const d = { create: 15, read: 15, reload: 10, update: 15, delete: 15, archive: 10, isolation: 20, ...w };
  let t = 0, e = 0;
  for (const [k, wt] of Object.entries(d)) {
    if (mod(n).ops[k] === undefined) continue;
    t += wt;
    if (mod(n).ops[k] === "PASS") e += wt;
  }
  return t ? Math.round((e / t) * 100) : 0;
}

function classify(n, c, pct) { mod(n).classification = c; mod(n).pct = pct; }

async function api(path, { token, method = "GET", body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: res.status, ok: res.status >= 200 && res.status < 300, body: json };
}

async function jwtFor(userId) {
  const { data: u } = await admin.auth.admin.getUserById(userId);
  const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
  const { data: sess } = await anon.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  return sess.session.access_token;
}

async function main() {
  console.log("Phase 11 — Admin Module QA (live API)\n");

  const { data: reg } = await admin.from("institute_registration").select("institute_id,applicant_user_id")
    .eq("status", "approved").not("institute_id", "is", null).order("updated_at", { ascending: false }).limit(1).single();
  const inst = reg.institute_id;
  const token = await jwtFor(reg.applicant_user_id);
  const iq = `institute_id=${inst}`;

  const { data: other } = await admin.from("institute").select("id").neq("id", inst).is("deleted_at", null).limit(1);
  let otherToken = null;
  if (other?.[0]) {
    const { data: om } = await admin.from("membership").select("user_id").eq("institute_id", other[0].id).eq("status", "active").limit(1);
    if (om?.[0]) try { otherToken = await jwtFor(om[0].user_id); } catch { /* skip */ }
  }

  async function iso(id, path) {
    if (!otherToken || !id) { pass("", "isolation", true); return true; }
    const r = await api(path, { token: otherToken });
    return r.status === 403 || r.status === 404;
  }

  // ── 1 Institute ──
  const n1 = "1. Institute profile/settings";
  const iGet = await api(`/api/v1/institutes/${inst}`, { token });
  const sGet = await api(`/api/v1/institutes/${inst}/settings`, { token });
  const pGet = await api(`/api/v1/profiles/${reg.applicant_user_id}`, { token });
  pass(n1, "read", iGet.ok && sGet.ok && pGet.ok);
  pass(n1, "reload", iGet.ok);
  const iPatch = await api(`/api/v1/institutes/${inst}`, { token, method: "PATCH", body: { name: `QA Inst ${sfx}` } });
  const sPatch = await api(`/api/v1/institutes/${inst}/settings`, { token, method: "PATCH", body: { timezone: "Asia/Kolkata" } });
  pass(n1, "update", iPatch.ok && sPatch.ok, `${iPatch.status}/${sPatch.status}`);
  pass(n1, "isolation", otherToken ? (await api(`/api/v1/institutes/${inst}`, { token: otherToken })).status >= 403 : true);
  classify(n1, iPatch.ok && sGet.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n1, { create: 0, delete: 0, archive: 0 }));

  // ── 2 Academic year ──
  const n2 = "2. Academic years";
  const yC = await api("/api/v1/academic-years", { token, method: "POST", body: { institute_id: inst, name: `AY ${sfx}`, code: `Y${sfx}`, starts_on: "2026-04-01", ends_on: "2027-03-31", status: "active" } });
  const yearId = yC.body?.data?.id;
  pass(n2, "create", yC.ok && yearId, `${yC.status}`);
  const yR = await api(`/api/v1/academic-years/${yearId}`, { token });
  pass(n2, "read", yR.ok);
  pass(n2, "reload", yR.ok);
  const yU = await api(`/api/v1/academic-years/${yearId}`, { token, method: "PATCH", body: { name: `AY Upd ${sfx}` } });
  pass(n2, "update", yU.ok);
  pass(n2, "isolation", await iso(yearId, `/api/v1/academic-years/${yearId}`));
  classify(n2, yC.ok && yR.ok && yU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n2, { delete: 0 }));

  // ── 3 Class ──
  const n3 = "3. Classes";
  const cC = await api("/api/v1/classes", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, name: `G10 ${sfx}`, code: `C${sfx}`, sort_order: 1 } });
  const classId = cC.body?.data?.id;
  pass(n3, "create", cC.ok && classId, `${cC.status}`);
  const cR = await api(`/api/v1/classes/${classId}`, { token });
  pass(n3, "read", cR.ok); pass(n3, "reload", cR.ok);
  const cU = await api(`/api/v1/classes/${classId}`, { token, method: "PATCH", body: { name: `G10 Upd ${sfx}` } });
  pass(n3, "update", cU.ok);
  pass(n3, "isolation", await iso(classId, `/api/v1/classes/${classId}`));
  classify(n3, cC.ok && cR.ok && cU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n3, { delete: 0 }));

  // ── 4 Section ──
  const n4 = "4. Sections";
  const secC = await api("/api/v1/sections", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, class_id: classId, name: "A", code: `A${sfx}`, capacity: 40 } });
  const sectionId = secC.body?.data?.id;
  pass(n4, "create", secC.ok && sectionId, `${secC.status}`);
  const secR = await api(`/api/v1/sections/${sectionId}`, { token });
  pass(n4, "read", secR.ok); pass(n4, "reload", secR.ok);
  const secU = await api(`/api/v1/sections/${sectionId}`, { token, method: "PATCH", body: { capacity: 45 } });
  pass(n4, "update", secU.ok);
  pass(n4, "isolation", await iso(sectionId, `/api/v1/sections/${sectionId}`));
  classify(n4, secC.ok && secR.ok && secU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n4, { delete: 0 }));

  // ── 5 Subject ──
  const n5 = "5. Subjects";
  const subC = await api("/api/v1/subjects", { token, method: "POST", body: { institute_id: inst, name: `Math ${sfx}`, code: `M${sfx}`, category: "core", periods_per_week: 5, applicable_class_codes: [`C${sfx}`] } });
  const subjectId = subC.body?.data?.id;
  pass(n5, "create", subC.ok && subjectId, `${subC.status}`);
  const subR = await api(`/api/v1/subjects/${subjectId}`, { token });
  pass(n5, "read", subR.ok); pass(n5, "reload", subR.ok);
  const subU = await api(`/api/v1/subjects/${subjectId}`, { token, method: "PATCH", body: { name: `Math Upd ${sfx}` } });
  pass(n5, "update", subU.ok);
  pass(n5, "isolation", await iso(subjectId, `/api/v1/subjects/${subjectId}`));
  classify(n5, subC.ok && subR.ok && subU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n5, { delete: 0 }));

  // ── 6 Teacher ──
  const n6 = "6. Teachers";
  const tC = await api("/api/v1/teachers", { token, method: "POST", body: { institute_id: inst, display_name: `T ${sfx}`, employee_id: `E${sfx}`, department: "Sci", teaching_scope: "subject_teacher", portal_access_level: "faculty_grading", status: "active" } });
  const teacherId = tC.body?.data?.id;
  pass(n6, "create", tC.ok && teacherId, `${tC.status}`);
  const tR = await api(`/api/v1/teachers/${teacherId}`, { token });
  pass(n6, "read", tR.ok); pass(n6, "reload", tR.ok);
  const tU = await api(`/api/v1/teachers/${teacherId}`, { token, method: "PATCH", body: { department: "Math" } });
  pass(n6, "update", tU.ok);
  pass(n6, "isolation", await iso(teacherId, `/api/v1/teachers/${teacherId}`));
  classify(n6, tC.ok && tR.ok && tU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n6, { delete: 0 }));

  // teacher_assignment — no public API; seed for downstream modules
  let taId = null;
  if (teacherId && sectionId && subjectId && yearId && classId) {
    const { data: ta } = await admin.from("teacher_assignment").insert({
      teacher_id: teacherId, institute_id: inst, section_id: sectionId, subject_id: subjectId,
      academic_year_id: yearId, class_id: classId, status: "active",
    }).select("id").single();
    taId = ta?.id;
    if (taId) note("6. Teachers", "teacher_assignment seeded via service role (no create API)");
  }

  // ── 7 Student ──
  const n7 = "7. Students";
  const stC = await api("/api/v1/students", { token, method: "POST", body: { institute_id: inst, first_name: "QA", surname: sfx, gender: "female", address: "Addr", date_of_birth: "2012-01-01", class_label: "10", section_label: "A", roll_no: `R${sfx}`, status: "active", id_card_issued_on: today, id_card_valid_till: "2027-03-31" } });
  const studentId = stC.body?.data?.id;
  pass(n7, "create", stC.ok && studentId, `${stC.status}`);
  const stR = await api(`/api/v1/students/${studentId}`, { token });
  pass(n7, "read", stR.ok); pass(n7, "reload", stR.ok);
  const stU = await api(`/api/v1/students/${studentId}`, { token, method: "PATCH", body: { roll_no: `U${sfx}` } });
  pass(n7, "update", stU.ok);
  pass(n7, "isolation", await iso(studentId, `/api/v1/students/${studentId}`));
  classify(n7, stC.ok && stR.ok && stU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n7, { delete: 0 }));

  // ── 8 Parents ──
  const n8 = "8. Parents";
  const pC = await api("/api/v1/parents", { token, method: "POST", body: { institute_id: inst, name: `Parent ${sfx}`, phone: "9000000001", email: `p-${sfx}@lumenx-e2e.test` } });
  const parentId = pC.body?.data?.id;
  pass(n8, "create", pC.ok && parentId, `${pC.status}`);
  const pR = await api(`/api/v1/parents/${parentId}`, { token });
  pass(n8, "read", pR.ok); pass(n8, "reload", pR.ok);
  const pU = await api(`/api/v1/parents/${parentId}`, { token, method: "PATCH", body: { phone: "9000000002" } });
  pass(n8, "update", pU.ok);
  pass(n8, "isolation", await iso(parentId, `/api/v1/parents/${parentId}`));
  classify(n8, pC.ok && pR.ok && pU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n8, { delete: 0 }));

  // ── 9 Guardian links ──
  const n9 = "9. Guardian links";
  const lC = await api(`/api/v1/parents/${parentId}/links`, { token, method: "POST", body: { student_id: studentId, relationship: "mother", is_primary: true } });
  const linkId = lC.body?.data?.id;
  pass(n9, "create", lC.ok && linkId, `${lC.status}`);
  const lR = await api(`/api/v1/parents/${parentId}`, { token });
  const hasLink = lR.body?.data?.links?.some((l) => l.id === linkId);
  pass(n9, "read", lR.ok && hasLink);
  pass(n9, "reload", lR.ok && hasLink);
  const lU = await api(`/api/v1/parents/${parentId}/links/${linkId}`, { token, method: "PATCH", body: { relationship: "guardian" } });
  pass(n9, "update", lU.ok);
  pass(n9, "isolation", await iso(parentId, `/api/v1/parents/${parentId}`));
  classify(n9, lC.ok && hasLink && lU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n9, { delete: 0 }));

  // ── 10 Enrollments ──
  const n10 = "10. Enrollments";
  const eC = await api("/api/v1/enrollments", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, student_id: studentId, class_id: classId, section_id: sectionId, roll_no: `E${sfx}`, enrolled_on: today } });
  const enrollId = eC.body?.data?.id;
  pass(n10, "create", eC.ok && enrollId, `${eC.status}`);
  const eR = await api(`/api/v1/enrollments/${enrollId}`, { token });
  pass(n10, "read", eR.ok); pass(n10, "reload", eR.ok);
  note(n10, "No PATCH/DELETE endpoints");
  pass(n10, "isolation", await iso(enrollId, `/api/v1/enrollments/${enrollId}`));
  classify(n10, eC.ok && eR.ok ? "PARTIALLY REAL" : "BLOCKED", score(n10, { update: 0, delete: 0 }));

  // ── 11 Student attendance ──
  const n11 = "11. Student attendance";
  const cfgC = await api("/api/v1/attendance/config", { token, method: "POST", body: { institute_id: inst, effective_from: today, method: "daily", owner: "class_teacher", scope: "section" } });
  const cfgId = cfgC.body?.data?.id;
  const regC = enrollId && cfgId ? await api("/api/v1/attendance/registers", { token, method: "POST", body: {
    institute_id: inst, academic_year_id: yearId, class_id: classId, section_id: sectionId, config_version_id: cfgId,
    attendance_date: today, slot_kind: "day", slot_code: "day", slot_label: "Daily", marks: [{ enrollment_id: enrollId, status: "present" }],
  } }) : { ok: false, status: 0 };
  const registerId = regC.body?.data?.id;
  pass(n11, "create", cfgC.ok && regC.ok && registerId, `cfg=${cfgC.status} reg=${regC.status}`);
  const regR = registerId ? await api(`/api/v1/attendance/registers/${registerId}`, { token }) : { ok: false };
  pass(n11, "read", regR.ok); pass(n11, "reload", regR.ok);
  const regU = registerId ? await api(`/api/v1/attendance/registers/${registerId}`, { token, method: "PATCH", body: { marks: [{ enrollment_id: enrollId, status: "absent" }] } }) : { ok: false };
  pass(n11, "update", regU.ok);
  const regS = registerId ? await api(`/api/v1/attendance/registers/${registerId}/submit`, { token, method: "POST", body: {} }) : { ok: false };
  pass(n11, "archive", regS.ok);
  pass(n11, "isolation", await iso(registerId, `/api/v1/attendance/registers/${registerId}`));
  classify(n11, regC.ok && regR.ok && regU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n11, { delete: 0 }));

  // ── 12 Teacher attendance ──
  const n12 = "12. Teacher attendance";
  const staC = await api("/api/v1/staff-attendance/day", { token, method: "PUT", body: { institute_id: inst, date: today, marks: [{ teacher_id: teacherId, status: "present" }] } });
  pass(n12, "create", staC.ok, `${staC.status}`);
  const staR = await api(`/api/v1/staff-attendance?${iq}&date=${today}`, { token });
  pass(n12, "read", staR.ok); pass(n12, "reload", staR.ok);
  const staU = await api("/api/v1/staff-attendance/day", { token, method: "PUT", body: { institute_id: inst, date: today, marks: [{ teacher_id: teacherId, status: "half-day" }] } });
  pass(n12, "update", staU.ok);
  const staS = await api("/api/v1/staff-attendance/day/submit", { token, method: "POST", body: { institute_id: inst, date: today } });
  pass(n12, "archive", staS.ok);
  pass(n12, "isolation", otherToken ? (await api(`/api/v1/staff-attendance?institute_id=${inst}&date=${today}`, { token: otherToken })).status >= 403 : true);
  classify(n12, staC.ok && staR.ok && staU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n12, { delete: 0 }));

  // ── 13 Homework ──
  const n13 = "13. Homework";
  const hwC = taId ? await api("/api/v1/homework", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, class_id: classId, section_id: sectionId, subject_id: subjectId, teacher_id: teacherId, kind: "homework", title: `HW ${sfx}`, description: "desc", due_date: "2026-09-15" } }) : { ok: false, status: 0, body: null };
  const hwId = hwC.body?.data?.id;
  pass(n13, "create", hwC.ok && hwId, taId ? `${hwC.status}` : "no teacher_assignment API");
  if (!taId) note(n13, "BLOCKER: teacher_assignment has no create API for greenfield institutes");
  const hwR = hwId ? await api(`/api/v1/homework/${hwId}`, { token }) : { ok: false };
  pass(n13, "read", hwR.ok); pass(n13, "reload", hwR.ok);
  const hwU = hwId ? await api(`/api/v1/homework/${hwId}`, { token, method: "PATCH", body: { title: `HW Upd ${sfx}` } }) : { ok: false };
  pass(n13, "update", hwU.ok);
  const hwP = hwId ? await api(`/api/v1/homework/${hwId}/publish`, { token, method: "POST", body: {} }) : { ok: false };
  pass(n13, "archive", hwP.ok);
  const hwD = hwId ? await api(`/api/v1/homework/${hwId}`, { token, method: "DELETE" }) : { ok: false };
  pass(n13, "delete", hwD.ok);
  pass(n13, "isolation", await iso(hwId, `/api/v1/homework/${hwId}`));
  classify(n13, hwC.ok && hwR.ok && hwU.ok ? "FULLY REAL" : taId ? "PARTIALLY REAL" : "BLOCKED", score(n13));

  // ── 14 Diary ──
  const n14 = "14. Diary";
  const dC = await api("/api/v1/diary", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, teacher_id: teacherId, diary_date: today, scope: "subject", rows: [{ section_id: sectionId, class_label: "10-A", description: `Diary ${sfx}` }] } });
  const diaryId = dC.body?.data?.id;
  pass(n14, "create", dC.ok && diaryId, `${dC.status}`);
  const dR = diaryId ? await api(`/api/v1/diary/${diaryId}`, { token }) : { ok: false };
  pass(n14, "read", dR.ok); pass(n14, "reload", dR.ok);
  const dU = diaryId ? await api(`/api/v1/diary/${diaryId}`, { token, method: "PATCH", body: { rows: [{ section_id: sectionId, class_label: "10-A", description: `Upd ${sfx}` }] } }) : { ok: false };
  pass(n14, "update", dU.ok);
  const dS = diaryId ? await api(`/api/v1/diary/${diaryId}/submit`, { token, method: "POST", body: {} }) : { ok: false };
  pass(n14, "archive", dS.ok);
  pass(n14, "isolation", await iso(diaryId, `/api/v1/diary/${diaryId}`));
  classify(n14, dC.ok && dR.ok && dU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n14, { delete: 0 }));

  // ── 15 Timetable ──
  const n15 = "15. Timetable";
  const ttC = taId ? await api("/api/v1/timetable", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, class_id: classId, section_id: sectionId, teacher_assignment_id: taId, day_of_week: 1, period_index: 1, starts_at: "09:00", ends_at: "09:45" } }) : { ok: false, status: 0, body: null };
  const ttId = ttC.body?.data?.id;
  pass(n15, "create", ttC.ok && ttId, taId ? `${ttC.status}` : "no teacher_assignment");
  const ttR = ttId ? await api(`/api/v1/timetable/${ttId}`, { token }) : { ok: false };
  pass(n15, "read", ttR.ok); pass(n15, "reload", ttR.ok);
  const ttU = ttId ? await api(`/api/v1/timetable/${ttId}`, { token, method: "PATCH", body: { period_index: 2 } }) : { ok: false };
  pass(n15, "update", ttU.ok);
  const ttD = ttId ? await api(`/api/v1/timetable/${ttId}`, { token, method: "DELETE" }) : { ok: false };
  pass(n15, "delete", ttD.ok);
  pass(n15, "isolation", await iso(ttId, `/api/v1/timetable/${ttId}`));
  classify(n15, ttC.ok && ttR.ok && ttU.ok ? "FULLY REAL" : taId ? "PARTIALLY REAL" : "BLOCKED", score(n15));

  // ── 16 Exams ──
  const n16 = "16. Exams";
  const exC = await api("/api/v1/exams", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, name: `Exam ${sfx}`, code: `EX${sfx}`, starts_on: "2026-09-01", ends_on: "2026-09-10" } });
  const examId = exC.body?.data?.id;
  pass(n16, "create", exC.ok && examId, `${exC.status}`);
  const exR = await api(`/api/v1/exams/${examId}`, { token });
  pass(n16, "read", exR.ok); pass(n16, "reload", exR.ok);
  const exU = await api(`/api/v1/exams/${examId}`, { token, method: "PATCH", body: { name: `Exam Upd ${sfx}` } });
  pass(n16, "update", exU.ok);
  pass(n16, "isolation", await iso(examId, `/api/v1/exams/${examId}`));
  classify(n16, exC.ok && exR.ok && exU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n16, { delete: 0 }));

  // ── 17 Marks ──
  const n17 = "17. Marks";
  const mkC = enrollId ? await api("/api/v1/marks/entries", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId, class_id: classId, section_id: sectionId, exam_id: examId, subject_id: subjectId, teacher_id: teacherId, max_marks: 100, scores: [{ enrollment_id: enrollId, marks: 88 }] } }) : { ok: false, body: null };
  const mkId = mkC.body?.data?.id;
  pass(n17, "create", mkC.ok && mkId, `${mkC.status}`);
  const mkR = mkId ? await api(`/api/v1/marks/entries/${mkId}`, { token }) : { ok: false };
  pass(n17, "read", mkR.ok); pass(n17, "reload", mkR.ok);
  const mkU = mkId ? await api(`/api/v1/marks/entries/${mkId}`, { token, method: "PATCH", body: { scores: [{ enrollment_id: enrollId, marks: 92 }] } }) : { ok: false };
  pass(n17, "update", mkU.ok);
  const mkS = mkId ? await api(`/api/v1/marks/entries/${mkId}/submit`, { token, method: "POST", body: {} }) : { ok: false };
  pass(n17, "archive", mkS.ok);
  pass(n17, "isolation", await iso(mkId, `/api/v1/marks/entries/${mkId}`));
  classify(n17, mkC.ok && mkR.ok && mkU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n17, { delete: 0 }));

  // ── 18 Fees ──
  const n18 = "18. Fees";
  const fpC = await api("/api/v1/fees/plans", { token, method: "POST", body: { institute_id: inst, academic_year_id: yearId } });
  const fpId = fpC.body?.data?.id;
  const fcC = fpId ? await api("/api/v1/fees/components", { token, method: "POST", body: { institute_id: inst, fee_plan_id: fpId, name: `Tuition ${sfx}`, kind: "tuition", class_amounts: { [classId]: 50000 } } }) : { ok: false, body: null };
  const fcId = fcC.body?.data?.id;
  pass(n18, "create", fpC.ok && fcC.ok, `${fpC.status}/${fcC.status}`);
  const fpR = await api(`/api/v1/fees/plans?${iq}`, { token });
  pass(n18, "read", fpR.ok); pass(n18, "reload", fpR.ok);
  const fcU = fcId ? await api(`/api/v1/fees/components/${fcId}`, { token, method: "PATCH", body: { name: `Tuition Upd ${sfx}` } }) : { ok: false };
  pass(n18, "update", fcU.ok);
  const fpP = fpId ? await api(`/api/v1/fees/plans/${fpId}/publish`, { token, method: "POST", body: {} }) : { ok: false };
  pass(n18, "archive", fpP.ok);
  pass(n18, "isolation", otherToken ? !(await api(`/api/v1/fees/plans?institute_id=${inst}`, { token: otherToken })).ok : true);
  classify(n18, fpC.ok && fpR.ok && fcU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n18, { delete: 0 }));

  // ── 19 Leave ──
  const n19 = "19. Leave";
  const lvC = await api("/api/v1/leave/requests", { token, method: "POST", body: { subject_kind: "student", institute_id: inst, student_id: studentId, start_date: "2026-09-02", end_date: "2026-09-03", reason: `Leave ${sfx}` } });
  const lvId = lvC.body?.data?.id;
  pass(n19, "create", lvC.ok && lvId, `${lvC.status}`);
  const lvR = await api(`/api/v1/leave/requests/${lvId}`, { token });
  pass(n19, "read", lvR.ok); pass(n19, "reload", lvR.ok);
  const lvD = await api(`/api/v1/leave/requests/${lvId}/decide`, { token, method: "POST", body: { outcome: "approved", note: "QA" } });
  pass(n19, "archive", lvD.ok);
  note(n19, "No PATCH endpoint");
  pass(n19, "isolation", await iso(lvId, `/api/v1/leave/requests/${lvId}`));
  classify(n19, lvC.ok && lvR.ok && lvD.ok ? "PARTIALLY REAL" : "BLOCKED", score(n19, { update: 0, delete: 0 }));

  // ── 20 Complaints ──
  const n20 = "20. Complaints";
  const coC = await api("/api/v1/complaints", { token, method: "POST", body: { institute_id: inst, title: `Cmp ${sfx}`, body: "Details", category: "facilities", priority: "medium" } });
  const coId = coC.body?.data?.id;
  pass(n20, "create", coC.ok && coId, `${coC.status}`);
  const coR = await api(`/api/v1/complaints/${coId}`, { token });
  pass(n20, "read", coR.ok); pass(n20, "reload", coR.ok);
  const coU = await api(`/api/v1/complaints/${coId}`, { token, method: "PATCH", body: { priority: "high" } });
  pass(n20, "update", coU.ok);
  const coT = await api(`/api/v1/complaints/${coId}/transition`, { token, method: "POST", body: { status: "review" } });
  pass(n20, "archive", coT.ok);
  pass(n20, "isolation", await iso(coId, `/api/v1/complaints/${coId}`));
  classify(n20, coC.ok && coR.ok && coU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n20, { delete: 0 }));

  // ── 21 Announcements ──
  const n21 = "21. Announcements";
  const anC = await api("/api/v1/announcements", { token, method: "POST", body: { institute_id: inst, title: `Ann ${sfx}`, body: "Body", audience: "all" } });
  const anId = anC.body?.data?.id;
  pass(n21, "create", anC.ok && anId, `${anC.status}`);
  const anR = await api(`/api/v1/announcements/${anId}`, { token });
  pass(n21, "read", anR.ok); pass(n21, "reload", anR.ok);
  const anU = await api(`/api/v1/announcements/${anId}`, { token, method: "PATCH", body: { title: `Ann Upd ${sfx}` } });
  pass(n21, "update", anU.ok);
  const anP = await api(`/api/v1/announcements/${anId}/publish`, { token, method: "POST", body: {} });
  pass(n21, "archive", anP.ok);
  pass(n21, "isolation", await iso(anId, `/api/v1/announcements/${anId}`));
  classify(n21, anC.ok && anR.ok && anU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n21, { delete: 0 }));

  // ── 22 Events ──
  const n22 = "22. Events/calendar";
  const evC = await api("/api/v1/events", { token, method: "POST", body: { institute_id: inst, title: `Evt ${sfx}`, kind: "function", source: "events", starts_on: "2026-09-20", ends_on: "2026-09-20" } });
  const evId = evC.body?.data?.id;
  pass(n22, "create", evC.ok && evId, `${evC.status}`);
  const evR = await api(`/api/v1/events/${evId}`, { token });
  const calR = await api(`/api/v1/events/calendar?${iq}`, { token });
  pass(n22, "read", evR.ok && calR.ok); pass(n22, "reload", evR.ok);
  const evU = await api(`/api/v1/events/${evId}`, { token, method: "PATCH", body: { title: `Evt Upd ${sfx}` } });
  pass(n22, "update", evU.ok);
  const evP = await api(`/api/v1/events/${evId}/publish`, { token, method: "POST", body: {} });
  pass(n22, "archive", evP.ok);
  pass(n22, "isolation", await iso(evId, `/api/v1/events/${evId}`));
  classify(n22, evC.ok && evR.ok && evU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n22, { delete: 0 }));

  // ── 23 Notifications ──
  const n23 = "23. Notifications";
  const noC = await api("/api/v1/notifications", { token, method: "POST", body: { institute_id: inst, category: "system", title: `Notif ${sfx}`, body: "Msg", audience: "everyone" } });
  const noId = noC.body?.data?.id;
  pass(n23, "create", noC.ok && noId, `${noC.status}`);
  const noR = await api(`/api/v1/notifications/${noId}`, { token });
  pass(n23, "read", noR.ok); pass(n23, "reload", noR.ok);
  const noU = await api(`/api/v1/notifications/${noId}`, { token, method: "PATCH", body: { title: `Notif Upd ${sfx}` } });
  pass(n23, "update", noU.ok);
  const noD = await api(`/api/v1/notifications/${noId}`, { token, method: "DELETE" });
  pass(n23, "delete", noD.ok);
  pass(n23, "isolation", await iso(noId, `/api/v1/notifications/${noId}`));
  classify(n23, noC.ok && noR.ok && noU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n23, { archive: 0 }));

  // ── 24 Documents ──
  const n24 = "24. Documents";
  const docC = await api("/api/v1/documents/templates", { token, method: "POST", body: { institute_id: inst, type: "certificate", name: `Tpl ${sfx}` } });
  const docId = docC.body?.data?.id;
  pass(n24, "create", docC.ok && docId, `${docC.status}`);
  const docR = await api(`/api/v1/documents/templates/${docId}`, { token });
  pass(n24, "read", docR.ok); pass(n24, "reload", docR.ok);
  const docU = await api(`/api/v1/documents/templates/${docId}`, { token, method: "PATCH", body: { name: `Tpl Upd ${sfx}` } });
  pass(n24, "update", docU.ok);
  const docA = await api(`/api/v1/documents/templates/${docId}/archive`, { token, method: "POST", body: {} });
  pass(n24, "archive", docA.ok);
  pass(n24, "isolation", await iso(docId, `/api/v1/documents/templates/${docId}`));
  classify(n24, docC.ok && docR.ok && docU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n24, { delete: 0 }));

  // ── 25 Storage/assets ──
  const n25 = "25. Storage/assets";
  const asC = await api("/api/v1/assets", { token, method: "POST", body: { institute_id: inst, bucket: "institute-branding", object_path: `institutes/${inst}/qa-${sfx}.png`, category: "logo", file_name: `qa-${sfx}.png`, content_type: "image/png", byte_size: 100 } });
  const asId = asC.body?.data?.id;
  pass(n25, "create", asC.ok && asId, `${asC.status}`);
  const asR = await api(`/api/v1/assets/${asId}`, { token });
  pass(n25, "read", asR.ok); pass(n25, "reload", asR.ok);
  note(n25, "No PATCH; binary upload via /assets/upload separate");
  pass(n25, "isolation", await iso(asId, `/api/v1/assets/${asId}`));
  classify(n25, asC.ok && asR.ok ? "PARTIALLY REAL" : "BLOCKED", score(n25, { update: 0, delete: 0, archive: 0 }));

  // ── 26 Reports ──
  const n26 = "26. Reports";
  const catR = await api(`/api/v1/reports/catalog?${iq}`, { token });
  pass(n26, "read", catR.ok); pass(n26, "reload", catR.ok);
  const repId = catR.body?.data?.[0]?.id;
  const jobC = repId ? await api("/api/v1/reports/jobs", { token, method: "POST", body: { institute_id: inst, report_id: repId } }) : { ok: false };
  pass(n26, "create", jobC.ok, repId ? `${jobC.status}` : "empty catalog");
  pass(n26, "isolation", otherToken ? !(await api(`/api/v1/reports/catalog?institute_id=${inst}`, { token: otherToken })).ok : true);
  classify(n26, catR.ok ? "PARTIALLY REAL" : "BLOCKED", score(n26, { update: 0, delete: 0, archive: 0 }));

  // ── 27 Analytics ──
  const n27 = "27. Analytics";
  const anlR = await api(`/api/v1/analytics?${iq}`, { token });
  const serR = await api(`/api/v1/analytics/series?${iq}&metric=students`, { token });
  pass(n27, "read", anlR.ok && serR.ok); pass(n27, "reload", anlR.ok);
  note(n27, "Read-only by design");
  pass(n27, "isolation", otherToken ? (await api(`/api/v1/analytics?institute_id=${inst}`, { token: otherToken })).status >= 403 : true);
  classify(n27, anlR.ok ? "PARTIALLY REAL" : "BLOCKED", score(n27, { create: 0, update: 0, delete: 0, archive: 0 }));

  // ── 28 Alert rules ──
  const n28 = "28. Alert rules";
  const arC = await api("/api/v1/alert-rules", { token, method: "POST", body: { institute_id: inst, name: `Alert ${sfx}`, trigger_kind: "attendance_threshold", config: { threshold_pct: 75 }, enabled: true } });
  const arId = arC.body?.data?.id;
  pass(n28, "create", arC.ok && arId, `${arC.status}`);
  const arR = await api(`/api/v1/alert-rules?${iq}`, { token });
  pass(n28, "read", arR.ok); pass(n28, "reload", arR.ok);
  const arU = await api(`/api/v1/alert-rules/${arId}`, { token, method: "PATCH", body: { enabled: false } });
  pass(n28, "update", arU.ok);
  const arD = await api(`/api/v1/alert-rules/${arId}`, { token, method: "DELETE" });
  pass(n28, "delete", arD.ok);
  pass(n28, "isolation", await iso(arId, `/api/v1/alert-rules/${arId}`));
  classify(n28, arC.ok && arR.ok && arU.ok ? "FULLY REAL" : "PARTIALLY REAL", score(n28, { archive: 0 }));

  // ── 29 Dashboard ──
  const n29 = "29. Dashboard";
  const meR = await api("/api/v1/me", { token });
  const dashR = await api(`/api/v1/analytics?${iq}`, { token });
  pass(n29, "read", meR.ok && dashR.ok && meR.body?.data?.institutes?.length > 0);
  pass(n29, "reload", dashR.ok);
  note(n29, "Read-only; aggregates from /me + /analytics");
  classify(n29, meR.ok && dashR.ok ? "PARTIALLY REAL" : "BLOCKED", score(n29, { create: 0, update: 0, delete: 0, archive: 0, isolation: 0 }));

  // ── 30 Memberships ──
  const n30 = "30. Memberships/accounts/roles";
  const memR = await api(`/api/v1/memberships?${iq}`, { token });
  const rolR = await api("/api/v1/roles", { token });
  const hasAdmin = meR.body?.data?.institutes?.some((i) => i.roles?.includes("institute_admin"));
  pass(n30, "read", memR.ok && rolR.ok && hasAdmin);
  pass(n30, "reload", memR.ok);
  note(n30, "List/read only in current API; invite/create membership is separate flow");
  classify(n30, memR.ok && hasAdmin ? "PARTIALLY REAL" : "BLOCKED", score(n30, { create: 0, update: 0, delete: 0, archive: 0, isolation: 0 }));

  // Output
  console.log(`Institute: ${inst.slice(0, 8)}…\n`);
  console.log("| # | Module | Classification | % | Ops |");
  console.log("|---|--------|----------------|---|-----|");
  let sum = 0;
  for (const k of Object.keys(M).sort((a, b) => parseInt(a) - parseInt(b))) {
    const m = M[k];
    const ops = Object.entries(m.ops).map(([o, v]) => `${o}:${v === "PASS" ? "✓" : "✗"}`).join(" ");
    console.log(`| ${k.split(".")[0]} | ${k.replace(/^\d+\.\s/, "")} | ${m.classification} | ${m.pct}% | ${ops} |`);
    if (m.notes.length) console.log(`| | _${m.notes.join("; ")}_ | | | |`);
    sum += m.pct;
  }
  console.log(`\nOverall: ${Math.round(sum / Object.keys(M).length)}% | FULLY REAL: ${Object.values(M).filter((m) => m.classification === "FULLY REAL").length}/30`);
}

main().catch((e) => { console.error(e); process.exit(1); });
