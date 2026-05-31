import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Home,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Calendar,
  Users,
  Bell,
  MessageSquare,
  ShieldAlert,
  User as UserIcon,
  Moon,
  Sun,
  LogOut,
  Sparkles,
  Trophy,
  MoreHorizontal,
  Wallet,
  FileText,
  CalendarDays,
} from "lucide-react";
import { useApp } from "@/lib/app-state";
import type { Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";
import { ParentContextBar } from "./ParentContextBar";

const NAV: { to: string; label: string; icon: typeof Home; roles: Role[] }[] = [
  { to: "/", label: "Home", icon: Home, roles: ["parent", "teacher", "student"] },
  { to: "/growth", label: "Growth", icon: Sparkles, roles: ["parent", "student"] },
  {
    to: "/attendance",
    label: "Attendance",
    icon: ClipboardCheck,
    roles: ["parent", "teacher", "student"],
  },
  {
    to: "/assignments",
    label: "Assignments",
    icon: BookOpen,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/marks", label: "Marks", icon: GraduationCap, roles: ["parent", "teacher", "student"] },
  { to: "/exams", label: "Exams", icon: GraduationCap, roles: ["parent", "teacher", "student"] },
  { to: "/timetable", label: "Timetable", icon: Calendar, roles: ["parent", "teacher", "student"] },
  { to: "/events", label: "Events", icon: CalendarDays, roles: ["parent", "teacher", "student"] },
  { to: "/fees", label: "Fees", icon: Wallet, roles: ["parent", "student"] },
  { to: "/sports", label: "Sports", icon: Trophy, roles: ["parent", "teacher", "student"] },
  { to: "/id-card", label: "ID Card", icon: FileText, roles: ["parent", "student"] },
  { to: "/teachers", label: "Teachers", icon: Users, roles: ["parent", "student"] },
  {
    to: "/messages",
    label: "Messages",
    icon: MessageSquare,
    roles: ["parent", "teacher", "student"],
  },
  {
    to: "/complaints",
    label: "Complaints",
    icon: ShieldAlert,
    roles: ["parent", "teacher", "student"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["parent", "teacher", "student"],
  },
  { to: "/profile", label: "Profile", icon: UserIcon, roles: ["parent", "teacher", "student"] },
];

const ROLE_LABEL: Record<Role, string> = {
  parent: "Parent",
  teacher: "Teacher",
  student: "Student",
};

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, role, theme, toggleTheme, signOut, institute, studentIncludedMode, activeChildId } =
    useApp();
  const nav = useNavigate();
  const loc = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (!user || !role) nav({ to: "/login" });
  }, [user, role, nav]);

  const items = useMemo(() => {
    let list = NAV.filter((n) => role && n.roles.includes(role));
    if (role === "parent" && !studentIncludedMode) {
      list = list.filter((n) => !["/growth", "/id-card"].includes(n.to));
    }
    return list;
  }, [role, studentIncludedMode]);
  const mobilePrimary = useMemo(() => {
    const order =
      role === "teacher"
        ? ["/", "/attendance", "/assignments", "/sports"]
        : role === "parent" && !studentIncludedMode
          ? ["/", "/attendance", "/fees", "/messages"]
          : ["/", "/growth", "/attendance", "/sports"];
    return order.map((p) => items.find((n) => n.to === p)).filter(Boolean) as typeof items;
  }, [items, role, studentIncludedMode]);
  const mobileSecondary = useMemo(
    () => items.filter((n) => !mobilePrimary.find((m) => m.to === n.to)),
    [items, mobilePrimary],
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [loc.pathname]);

  if (!user || !role) return null;

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">
      <header className="sticky top-0 z-40 glass border-b border-border">
        <div className="flex items-center gap-2 md:gap-3 px-3 md:px-8 h-14 md:h-16">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-gradient-primary shadow-glow grid place-items-center text-primary-foreground font-bold shrink-0">
              U
            </div>
            <div className="hidden min-w-0 md:block">
              <div className="font-display font-semibold leading-none">LumenX Connect</div>
              <div className="truncate text-[11px] text-muted-foreground" title={institute?.name}>
                {institute ? `${institute.name} · ${institute.code}` : "Education Ecosystem"}
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 md:gap-2 min-w-0">
            <GlobalSearch />
            <div className="hidden h-8 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-[10px] font-medium sm:inline-flex sm:text-xs">
              <span className="size-1.5 rounded-full bg-success" />
              {ROLE_LABEL[role]}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="hidden sm:inline-flex"
            >
              {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </Button>
            <Link to="/notifications">
              <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
                <Bell className="size-5" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="px-2 gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {user.name
                        .split(" ")
                        .map((p) => p[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.phone}</div>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                    <span className="size-1.5 rounded-full bg-success" /> {ROLE_LABEL[role]} portal
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav({ to: "/profile" })}>
                  <UserIcon className="size-4 mr-2" /> Profile & settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme} className="sm:hidden">
                  {theme === "dark" ? (
                    <Sun className="size-4 mr-2" />
                  ) : (
                    <Moon className="size-4 mr-2" />
                  )}{" "}
                  Toggle theme
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    signOut();
                    nav({ to: "/login" });
                  }}
                  className="text-destructive"
                >
                  <LogOut className="size-4 mr-2" /> Sign out & switch portal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {role === "parent" && <ParentContextBar />}

      <div className="flex min-w-0">
        <aside className="hidden lg:flex w-64 shrink-0 sticky top-16 h-[calc(100vh-4rem)] flex-col border-r border-border p-4 gap-1 bg-sidebar">
          {items.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                preload="intent"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <n.icon className="size-4" /> {n.label}
              </Link>
            );
          })}
          <div className="mt-auto text-[11px] text-muted-foreground px-3">v1.1 • LumenX EDU</div>
        </aside>

        <main className="flex-1 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8">
          <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 md:px-8 md:py-5">
            <div
              key={role === "parent" ? `${loc.pathname}:${activeChildId}` : loc.pathname}
              className="animate-in-up min-w-0"
            >
              {children ?? <Outlet />}
            </div>
          </div>
        </main>
      </div>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
        <div className="mx-auto max-w-2xl flex items-stretch justify-around px-1 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))]">
          {mobilePrimary.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                preload="intent"
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[clamp(8.5px,1.6vw+7px,11px)] transition-colors select-none touch-manipulation",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <div
                  className={cn("p-1.5 rounded-lg transition-colors", active && "bg-primary/10")}
                >
                  <n.icon className={cn("size-[1.15rem]", active && "stroke-[2.5]")} />
                </div>
                <span className="max-w-full truncate px-0.5 text-center leading-none">
                  {n.label}
                </span>
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-xl text-[clamp(8.5px,1.6vw+7px,11px)] transition-colors select-none touch-manipulation text-muted-foreground",
                )}
              >
                <div className="p-1.5 rounded-lg">
                  <MoreHorizontal className="size-[1.15rem]" />
                </div>
                <span className="leading-none">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-3xl p-0 max-h-[80vh]">
              <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                <SheetTitle className="font-display text-lg mb-4">
                  More in {ROLE_LABEL[role]}
                </SheetTitle>
                <div className="grid grid-cols-3 gap-2">
                  {mobileSecondary.map((n) => (
                    <Link
                      key={n.to}
                      to={n.to}
                      preload="intent"
                      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-border bg-card hover:bg-muted/40 transition-colors touch-manipulation active:scale-[0.97]"
                    >
                      <div className="size-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
                        <n.icon className="size-5" />
                      </div>
                      <span className="text-[11px] font-medium">{n.label}</span>
                    </Link>
                  ))}
                </div>
                <button
                  onClick={() => {
                    signOut();
                    nav({ to: "/login" });
                  }}
                  className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive py-3 text-sm font-medium touch-manipulation"
                >
                  <LogOut className="size-4" /> Sign out & switch portal
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
