import { Hono } from "hono";
import health from "./health.js";
import me from "./me.js";
import timetable from "./timetable.js";
import attendance from "./attendance.js";
import exams from "./exams.js";
import marks from "./marks.js";
import homework from "./homework.js";
import diary from "./diary.js";
import students from "./students.js";
import parents from "./parents.js";
import teachers from "./teachers.js";
import staff from "./staff.js";
import {
  academicYears,
  classes,
  sections,
  subjects,
} from "./academics.js";
import { institutes, profiles, memberships, roles } from "./identity.js";
import notifications from "./notifications.js";
import audit from "./audit.js";
import fees from "./fees.js";
import transport from "./transport.js";
import leave from "./leave.js";
import events from "./events.js";
import announcements from "./announcements.js";
import staffAttendance from "./staff-attendance.js";
import complaints from "./complaints.js";
import documents from "./documents.js";
import certificates from "./certificates.js";
import admissions from "./admissions.js";
import careers from "./careers.js";
import activity from "./activity.js";
import messages from "./messages.js";
import assets from "./assets.js";
import recycle from "./recycle.js";
import type { AppBindings } from "../../types/app.js";

/**
 * /api/v1 — Institute-scoped API.
 *
 * Domain routers are mounted here as they are implemented. Each domain
 * module lives in its own file under `routes/v1/` and exports a Hono
 * instance which is mounted at the corresponding path.
 *
 * Planned domain mounts (in implementation order):
 *
 *   v1.route("/auth",          auth);
 *   v1.route("/institutes",    institutes);
 *   v1.route("/profiles",      profiles);
 *   v1.route("/memberships",   memberships);
 *   v1.route("/roles",         roles);
 *   v1.route("/students",      students);
 *   v1.route("/teachers",      teachers);
 *   v1.route("/parents",       parents);
 *   v1.route("/academic-years", academicYears);
 *   v1.route("/classes",       classes);
 *   v1.route("/sections",      sections);
 *   v1.route("/subjects",      subjects);
 *   v1.route("/fees",          fees);
 *   v1.route("/transport",     transport);
 *   v1.route("/notifications", notifications);
 *   v1.route("/admissions",    admissions);
 *   v1.route("/careers",       careers);
 *   v1.route("/documents",     documents);
 *   v1.route("/certificates",  certificates);
 *   v1.route("/activity",      activity);
 *   v1.route("/messages",      messages);
 *   v1.route("/assets",        assets);
 *   v1.route("/recycle",       recycle);
 *   // next unimplemented stub /api/nexus/billing
 */
const v1 = new Hono<AppBindings>();

// ── Operational ──────────────────────────────────────────────────
v1.route("/health", health);

// ── Session / actor ──────────────────────────────────────────────
v1.route("/me", me);

// ── Identity / tenancy ───────────────────────────────────────────
v1.route("/institutes", institutes);
v1.route("/profiles", profiles);
v1.route("/memberships", memberships);
v1.route("/roles", roles);

// ── Academic domains ─────────────────────────────────────────────
v1.route("/timetable", timetable);
v1.route("/attendance", attendance);
v1.route("/exams", exams);
v1.route("/marks", marks);
v1.route("/homework", homework);
v1.route("/diary", diary);
v1.route("/students", students);
v1.route("/parents", parents);
v1.route("/teachers", teachers);
v1.route("/staff", staff);
v1.route("/academic-years", academicYears);
v1.route("/classes", classes);
v1.route("/sections", sections);
v1.route("/subjects", subjects);
v1.route("/notifications", notifications);
v1.route("/audit", audit);
v1.route("/fees", fees);
v1.route("/transport", transport);
v1.route("/leave", leave);
v1.route("/events", events);
v1.route("/announcements", announcements);
v1.route("/staff-attendance", staffAttendance);
v1.route("/complaints", complaints);
v1.route("/documents", documents);
v1.route("/certificates", certificates);
v1.route("/admissions", admissions);
v1.route("/careers", careers);
v1.route("/activity", activity);
v1.route("/messages", messages);
v1.route("/assets", assets);
v1.route("/recycle", recycle);

export default v1;
