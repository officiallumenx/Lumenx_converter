import {
  LayoutDashboard,
  Users,
  GraduationCap,
  CalendarRange,
  ClipboardCheck,
  BarChart3,
  MessageSquare,
  MessageSquareWarning,
  Bell,
  ShieldCheck,
  HardDrive,
  Settings,
  Siren,
  KeyRound,
  Megaphone,
  Layers,
  ClipboardList,
  Bus,
  UserCheck,
  UserPlus,
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
  School,
  CalendarDays,
  NotebookPen,
  CreditCard,
  type LucideIcon,
} from "lucide-react";
import { ADMIN_MODULE_LABEL_BY_ROUTE as L } from "@/lib/admin-module-labels";

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
      { to: "/",          label: L["/"],            icon: LayoutDashboard },
      { to: "/analytics", label: L["/analytics"],        icon: BarChart3       },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/students", label: L["/students"],          icon: Users          },
      { to: "/teachers", label: L["/teachers"],          icon: GraduationCap  },
      { to: "/parents",  label: L["/parents"],           icon: Heart          },
      { to: "/accounts", label: L["/accounts"], icon: KeyRound       },
    ],
  },
  {
    label: "Academics",
    items: [
      { to: "/classes",              label: L["/classes"],  icon: LayoutGrid     },
      { to: "/enrollments",          label: L["/enrollments"], icon: UserPlus     },
      { to: "/academic-management",  label: L["/academic-management"], icon: School         },
      { to: "/subjects",             label: L["/subjects"],            icon: BookOpen       },
      { to: "/timetable",             label: L["/timetable"],            icon: CalendarRange  },
      { to: "/student-attendance",   label: L["/student-attendance"],  icon: ClipboardCheck },
      { to: "/attendance",           label: L["/attendance"], icon: BarChart3      },
      { to: "/teacher-attendance",   label: L["/teacher-attendance"],  icon: CalendarCheck  },
      { to: "/exams",                label: L["/exams"],               icon: ClipboardPen   },
      { to: "/marks",                label: L["/marks"],               icon: ClipboardList  },
      { to: "/homework",             label: L["/homework"],       icon: NotebookPen    },
      { to: "/diary",                label: L["/diary"],       icon: BookOpen       },
    ],
  },
  {
    label: "Communications",
    items: [
      { to: "/notifications", label: L["/notifications"], icon: Bell                 },
      { to: "/messages",      label: L["/messages"],      icon: MessageSquare        },
      { to: "/announcements", label: L["/announcements"], icon: Megaphone            },
      { to: "/alerts",        label: L["/alerts"],        icon: Siren                },
      { to: "/complaints",    label: L["/complaints"],    icon: MessageSquareWarning },
    ],
  },
  {
    label: "Operations",
    items: [
      { to: "/permissions", label: L["/permissions"], icon: ShieldCheck },
      { to: "/subscription", label: L["/subscription"], icon: CreditCard },
      { to: "/modules",     label: L["/modules"], icon: Layers      },
      { to: "/storage",     label: L["/storage"],        icon: HardDrive   },
      { to: "/settings",    label: L["/settings"],       icon: Settings    },
    ],
  },
  {
    label: "Services",
    items: [
      { to: "/transport",  label: L["/transport"],    icon: Bus          },
      { to: "/leave",      label: L["/leave"], icon: CalendarOff  },
      { to: "/fees",       label: L["/fees"],         icon: IndianRupee  },
      { to: "/admissions", label: L["/admissions"],   icon: UserCheck    },
      { to: "/careers",    label: L["/careers"],      icon: Briefcase    },
    ],
  },
  {
    label: "Institute",
    items: [
      { to: "/institute", label: L["/institute"],   icon: Landmark       },
      { to: "/templates", label: L["/templates"],        icon: LayoutTemplate },
      { to: "/documents", label: L["/documents"], icon: FolderOpen     },
      { to: "/calendar",  label: L["/calendar"],   icon: Calendar       },
      { to: "/events",    label: L["/events"],    icon: CalendarDays   },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports",             label: L["/reports"],    icon: FileBarChart },
      { to: "/teacher-performance", label: L["/teacher-performance"], icon: Award        },
    ],
  },
] as const;
