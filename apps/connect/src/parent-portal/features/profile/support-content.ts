export { SUPPORT_EMAIL } from "@/student-portal/features/profile/support-content";

export const PARENT_FAQS = [
  {
    q: "How do I switch between my children?",
    a: "Use the child switcher at the top of Home. Attendance, marks, fees, and messages always reflect the active learner.",
  },
  {
    q: "Where can I see assignments and homework?",
    a: "Open Homework to switch between assignments and homework. Each item shows its due date — there is no online submission; hand work in at school.",
  },
  {
    q: "How do I pay school fees?",
    a: "Go to Fees to view dues, receipts, and payment history for the selected child.",
  },
  {
    q: "What is on-behalf child access?",
    a: "In Settings, turn on Include student modules to add Growth to your menu — useful when your child does not carry their own phone. Digital ID cards are always available for every linked child.",
  },
  {
    q: "Can I message teachers directly?",
    a: "Yes. Open Messages to chat with class teachers and coordinators. All threads stay scoped to the active child.",
  },
  {
    q: "How do I raise a complaint?",
    a: "Use Complaints to submit issues to the institute. You can track status and responses in the same module.",
  },
] as const;

export const PARENT_HELP_TOPICS = [
  {
    title: "Getting started",
    body: "Home shows your child's overview. Use Attendance, Assignments, Marks, and Fees from the sidebar. Tap More on mobile for Events, Sports, Teachers, and Complaints.",
  },
  {
    title: "Academics",
    body: "Marks includes report cards and subject performance. Exams lists schedules and results. Growth shows streaks, badges, and improvement trends for your learner.",
  },
  {
    title: "Attendance & timetable",
    body: "Attendance shows monthly calendar and stats for the active child. Timetable lists their weekly schedule with today highlighted.",
  },
  {
    title: "Fees & communication",
    body: "Fees covers dues and receipts. Messages and Notifications keep you connected with school updates. Complaints helps you escalate formal issues.",
  },
  {
    title: "On-behalf of child",
    body: "Settings lets you edit your profile, enable student modules when acting for your learner, manage notifications, and reach Support & help.",
  },
] as const;
