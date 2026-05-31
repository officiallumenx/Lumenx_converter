import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardCheck,
  Bell,
  Calendar,
  Trophy,
  FileText,
  Wallet,
  History,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  studentsInClass,
  teachers,
  assignments,
  exams,
  schoolEvents,
  fees,
  reportCards,
  categorizedNotifications,
} from "@/lib/mock-data";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { getRecentSearches, pushRecentSearch } from "@/lib/search-recent";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const { role, studentIncludedMode } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;
  const showClassRoster = role === "teacher";

  const assignmentSearch = snap?.assignments ?? assignments;
  const reportSearch = snap?.reportCards ?? reportCards;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const notifs = useMemo(() => {
    if (role === "parent" && snap) return snap.notifications;
    return categorizedNotifications[role ?? "student"] ?? [];
  }, [role, snap]);

  const recent = useMemo(() => (open ? getRecentSearches() : []), [open]);

  const go = (to: string, label?: string) => {
    setOpen(false);
    if (label) pushRecentSearch({ label, path: to });
    nav({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex h-9 rounded-xl gap-2 text-muted-foreground font-normal pr-2"
      >
        <Search className="size-4" />
        <span>Search…</span>
        <kbd className="ml-2 hidden lg:inline-flex items-center gap-0.5 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="md:hidden"
      >
        <Search className="size-5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={
            role === "student"
              ? "Search your modules, assignments, events…"
              : role === "parent"
                ? snap
                  ? `Search modules for ${snap.shortName} (class ${snap.classTag})…`
                  : "Search modules for your selected learner…"
                : "Search students, teachers, assignments, events…"
          }
        />
        <CommandList className="max-h-[min(420px,70vh)] overflow-y-auto overflow-x-hidden">
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="Quick links">
            <CommandItem onSelect={() => go("/marks", "Marks & report cards")}>
              <GraduationCap className="size-4 mr-2" />
              Marks & Report cards
            </CommandItem>
            {(role === "parent" || role === "student") && (
              <CommandItem onSelect={() => go("/fees", "Fees")}>
                <Wallet className="size-4 mr-2" />
                Fees
              </CommandItem>
            )}
            <CommandItem onSelect={() => go("/events", "Events & holidays")}>
              <Calendar className="size-4 mr-2" />
              Events & Holidays
            </CommandItem>
            {(role === "student" || (role === "parent" && studentIncludedMode)) && (
              <CommandItem onSelect={() => go("/id-card", "Digital ID card")}>
                <FileText className="size-4 mr-2" />
                Digital ID Card
              </CommandItem>
            )}
            <CommandItem onSelect={() => go("/attendance", "Attendance")}>
              <ClipboardCheck className="size-4 mr-2" />
              Attendance
            </CommandItem>
          </CommandGroup>

          {recent.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent">
                {recent.map((r) => (
                  <CommandItem
                    key={`${r.path}-${r.at}`}
                    value={`recent ${r.label} ${r.path}`}
                    onSelect={() => go(r.path, r.label)}
                  >
                    <History className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {showClassRoster && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Students (your classes)">
                {studentsInClass.slice(0, 8).map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`student ${s.name} ${s.roll}`}
                    onSelect={() => go("/attendance", `Student ${s.name}`)}
                  >
                    <Users className="size-4 mr-2 text-muted-foreground" />
                    <span>{s.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">Roll {s.roll}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          {role !== "student" && (
            <CommandGroup
              heading={role === "parent" && snap ? `Teachers · ${snap.classTag}` : "Teachers"}
            >
              {teachers.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`teacher ${t.name} ${t.subject}`}
                  onSelect={() => go("/teachers", `Teacher ${t.name}`)}
                >
                  <Users className="size-4 mr-2 text-muted-foreground" />
                  <span>{t.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{t.subject}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {role !== "student" && <CommandSeparator />}
          <CommandGroup
            heading={role === "parent" && snap ? `Assignments · ${snap.shortName}` : "Assignments"}
          >
            {assignmentSearch.map((a) => (
              <CommandItem
                key={a.id}
                value={`assignment ${a.title} ${a.subject}`}
                onSelect={() => go("/assignments", a.title)}
              >
                <BookOpen className="size-4 mr-2 text-muted-foreground" />
                <span className="truncate">{a.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{a.subject}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Exams & Report cards">
            {exams.map((e) => (
              <CommandItem
                key={e.id}
                value={`exam ${e.title} ${e.subject}`}
                onSelect={() => go("/exams", e.title)}
              >
                <GraduationCap className="size-4 mr-2 text-muted-foreground" />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{e.date}</span>
              </CommandItem>
            ))}
            {reportSearch.map((r) => (
              <CommandItem
                key={r.id}
                value={`report ${r.term}`}
                onSelect={() => go("/marks", r.term)}
              >
                <FileText className="size-4 mr-2 text-muted-foreground" />
                <span>{r.term}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {r.percentage}% • {r.grade}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Events & Holidays">
            {schoolEvents.slice(0, 8).map((e) => (
              <CommandItem
                key={e.id}
                value={`event ${e.title} ${e.kind}`}
                onSelect={() => go("/events", e.title)}
              >
                <Calendar className="size-4 mr-2 text-muted-foreground" />
                <span className="truncate">{e.title}</span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">{e.kind}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          {role === "teacher" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Fees">
                {fees.map((f) => (
                  <CommandItem
                    key={f.id}
                    value={`fee ${f.title} ${f.term} ${f.status}`}
                    onSelect={() => go("/fees", f.title)}
                  >
                    <Wallet className="size-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{f.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      ₹{f.amount.toLocaleString("en-IN")} • {f.status}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          {role === "parent" && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Fees">
                <CommandItem
                  value="fee dues active learner"
                  onSelect={() => go("/fees", "Fee dues")}
                >
                  <Wallet className="size-4 mr-2 text-muted-foreground" />
                  <span>Fee dues (active learner)</span>
                  <span className="ml-auto text-xs text-muted-foreground">Open</span>
                </CommandItem>
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Notifications">
            {notifs.slice(0, 6).map((n) => (
              <CommandItem
                key={n.id}
                value={`notif ${n.title} ${n.desc}`}
                onSelect={() => go("/notifications", n.title)}
              >
                <Bell className="size-4 mr-2 text-muted-foreground" />
                <span className="truncate">{n.title}</span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">
                  {n.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Sports">
            <CommandItem onSelect={() => go("/sports", "Sports")}>
              <Trophy className="size-4 mr-2" />
              Sports overview
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
