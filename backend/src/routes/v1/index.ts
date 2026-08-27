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
 *   v1.route("/students",      students);
 *   v1.route("/teachers",      teachers);
 *   v1.route("/parents",       parents);
 *   v1.route("/classes",       classes);
 *   v1.route("/fees",          fees);
 *   v1.route("/transport",     transport);
 *   v1.route("/leave",         leave);
 *   v1.route("/notifications", notifications);
 *   v1.route("/admissions",    admissions);
 *   v1.route("/careers",       careers);
 *   v1.route("/documents",     documents);
 *   v1.route("/certificates",  certificates);
 *   v1.route("/activity",      activity);
 */
const v1 = new Hono<AppBindings>();

// ── Operational ──────────────────────────────────────────────────
v1.route("/health", health);

// ── Session / actor ──────────────────────────────────────────────
v1.route("/me", me);

// ── Academic domains ─────────────────────────────────────────────
v1.route("/timetable", timetable);
v1.route("/attendance", attendance);
v1.route("/exams", exams);
v1.route("/marks", marks);
v1.route("/homework", homework);
v1.route("/diary", diary);
v1.route("/students", students);
v1.route("/parents", parents);

export default v1;
