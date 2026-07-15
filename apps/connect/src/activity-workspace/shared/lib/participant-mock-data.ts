/** Mock institute roster for Activity Hub participant selector — replace via API. */
export const PARTICIPANT_CLASS_NAMES = ["6", "7", "8", "9", "10", "11", "12"] as const;

export const PARTICIPANT_SECTIONS = ["A", "B", "C"] as const;

export type ParticipantStudentOption = {
  id: string;
  name: string;
  className: string;
  section: string;
  rollNo: string;
};

export const PARTICIPANT_STUDENT_OPTIONS: ParticipantStudentOption[] = [
  { id: "stu-1", name: "Arjun Mehta", className: "9", section: "A", rollNo: "12" },
  { id: "stu-2", name: "Priya Nair", className: "9", section: "A", rollNo: "18" },
  { id: "stu-3", name: "Rohan Das", className: "9", section: "B", rollNo: "7" },
  { id: "stu-4", name: "Sneha Patel", className: "10", section: "A", rollNo: "22" },
  { id: "stu-5", name: "Kiran Joshi", className: "10", section: "B", rollNo: "5" },
  { id: "stu-6", name: "Meera Iyer", className: "11", section: "A", rollNo: "9" },
  { id: "stu-7", name: "Vikram Singh", className: "11", section: "C", rollNo: "14" },
  { id: "stu-8", name: "Anika Reddy", className: "12", section: "A", rollNo: "3" },
  { id: "stu-9", name: "Dev Sharma", className: "8", section: "B", rollNo: "21" },
  { id: "stu-10", name: "Lakshmi Rao", className: "7", section: "A", rollNo: "11" },
  { id: "stu-11", name: "Harish Varma", className: "10", section: "C", rollNo: "16" },
  { id: "stu-12", name: "Nisha Gupta", className: "10", section: "C", rollNo: "19" },
  { id: "stu-13", name: "Aditya Pillai", className: "9", section: "B", rollNo: "24" },
  { id: "stu-14", name: "Isha Kulkarni", className: "9", section: "A", rollNo: "30" },
];

export const SPORTS_STAFF_OPTIONS = [
  "Ananya Iyer",
  "Rahul Menon",
  "Suresh Kumar",
  "Manoj Pillai",
  "Pooja Desai",
  "Deepa Nambiar",
  "Vivek Sharma",
  "Lakshmi Reddy",
  "Neha Kulkarni",
  "Harish Pillai",
  "Karthik Naidu",
] as const;
