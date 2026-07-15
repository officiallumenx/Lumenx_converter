import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarRange,
  ClipboardCheck,
  BarChart3,
  MessageSquareWarning,
  Bell,
  ShieldCheck,
  HardDrive,
  Settings,
  CalendarDays,
  Siren,
  KeyRound,
  Megaphone,
  Layers,
  ClipboardList,
  Bus,
  UserCheck,
  Briefcase,
  Landmark,
  FileBarChart,
  Award,
  BookOpen,
  UserCog,
  LayoutTemplate,
  FolderOpen,
  Calendar,
  IndianRupee,
  CalendarOff,
  Heart,
  LayoutGrid,
  ClipboardPen,
  CalendarCheck,
  type LucideIcon,
} from "lucide-react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};
export type AdminNavGroup = { label: string; items: readonly AdminNavItem[] };

export const adminNav: readonly AdminNavGroup[] = [
  {
    label: "Intelligence",
    items: [
      { to: "/",          label: "Command Center",  icon: LayoutDashboard },
      { to: "/analytics", label: "Analytics",        icon: BarChart3       },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/students", label: "Students",          icon: Users          },
      { to: "/teachers", label: "Teachers",          icon: GraduationCap  },
      { to: "/parents",  label: "Parents",           icon: Heart          },
      { to: "/accounts", label: "Accounts & Access", icon: KeyRound       },
    ],
  },
  {
    label: "Academics",
    items: [
      { to: "/classes",            label: "Classes & Sections", icon: LayoutGrid     },
      { to: "/subjects",           label: "Subjects",           icon: BookOpen       },
      { to: "/timetable",          label: "Timetable",          icon: CalendarRange  },
      { to: "/attendance",         label: "Attendance",         icon: ClipboardCheck },
      { to: "/teacher-attendance", label: "Teacher Attendance", icon: CalendarCheck  },
      { to: "/exams",              label: "Exams",              icon: ClipboardPen   },
      { to: "/marks",              label: "Marks",              icon: ClipboardList  },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell                 },
      { to: "/announcements", label: "Announcements", icon: Megaphone            },
      { to: "/events",        label: "Events",        icon: CalendarDays         },
      { to: "/alerts",        label: "Alerts",        icon: Siren                },
      { to: "/complaints",    label: "Complaints",    icon: MessageSquareWarning },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/permissions", label: "Permissions",    icon: ShieldCheck },
      { to: "/modules",     label: "Modules & Plan", icon: Layers      },
      { to: "/storage",     label: "Storage",        icon: HardDrive   },
      { to: "/settings",    label: "Settings",       icon: Settings    },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/transport",  label: "Transport",    icon: Bus          },
      { to: "/leave",      label: "Leave Center", icon: CalendarOff  },
      { to: "/fees",       label: "Fees",         icon: IndianRupee  },
      { to: "/admissions", label: "Admissions",   icon: UserCheck    },
      { to: "/careers",    label: "Careers",      icon: Briefcase    },
    ],
  },
  {
    label: "Institute",
    items: [
      { to: "/institute", label: "Institute Profile",   icon: Landmark       },
      { to: "/templates", label: "Template Management", icon: LayoutTemplate },
      { to: "/documents", label: "Documents & Records", icon: FolderOpen     },
      { to: "/calendar",  label: "Academic Calendar",   icon: Calendar       },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports",             label: "Reporting Center",    icon: FileBarChart },
      { to: "/teacher-performance", label: "Teacher Performance", icon: Award        },
    ],
  },
] as const;
