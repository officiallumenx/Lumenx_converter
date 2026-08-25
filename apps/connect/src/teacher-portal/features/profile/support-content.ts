export const SUPPORT_EMAIL = "official.lumenx@gmail.com";

export const TEACHER_FAQS = [
  {
    q: "How do I mark attendance?",
    a: "Go to Attendance → select your class → mark students present or absent → Save draft or Submit. Submit asks for confirmation before finalizing.",
  },
  {
    q: "Can I edit attendance after submitting?",
    a: "Yes. Open Attendance → History, pick the date, tap Edit, make changes, and submit again.",
  },
  {
    q: "How do I add homework?",
    a: "Open Homework → New homework. Save as draft first, then Publish when ready. Expired items cannot be edited.",
  },
  {
    q: "Who can see teacher remarks?",
    a: "Remarks are visible to teachers, parents, and administrators. Students cannot see them in their portal.",
  },
  {
    q: "How do I enter exam marks?",
    a: "Exams are scheduled by admin. Open Marks or Exams → View details → Enter marks for your class, save a draft, then submit to Admin for publishing.",
  },
  {
    q: "Why can't I create or edit school events?",
    a: "Events are managed by the administration. Teachers have view-only access to the events calendar.",
  },
] as const;

export const HELP_TOPICS = [
  {
    title: "Getting started",
    body: "Use the sidebar to reach Dashboard, My Classes, Attendance, Homework, Marks, Students, and Messages. Mobile users can use the bottom bar and More menu.",
  },
  {
    title: "Classes & students",
    body: "My Classes shows only your assigned sections. Tap a class to view students. Tap a student row to expand profile details inline. The Students module lets you filter the full institute roster by class and section.",
  },
  {
    title: "Attendance workflow",
    body: "Select class, mark absences, use Save draft to keep progress, then Submit attendance after reviewing counts. A confirmation dialog appears before submit.",
  },
  {
    title: "Homework",
    body: "Create drafts, publish to students, track submissions, and filter by status including Expired. Delete is available; expired homework hides edit/publish actions.",
  },
  {
    title: "Marks & exams",
    body: "View exam schedules from admin. Enter marks per class, save drafts, and submit to Admin when ready. Empty mark fields stay empty — they are not treated as zero.",
  },
  {
    title: "Messages & complaints",
    body: "Compose messages from the Messages module. Raise complaints, respond, forward to admin, or close when resolved.",
  },
  {
    title: "Account & notifications",
    body: "Update your display name under Edit profile. Email and phone are read-only from admin. Manage notification toggles in Profile and change password with OTP verification.",
  },
] as const;
