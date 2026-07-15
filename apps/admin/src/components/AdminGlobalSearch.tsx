import { useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@lumenx/ui";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { buildAdminSearchIndex, type AdminSearchItem } from "@/lib/admin-search-data";
import { useDemoProfile } from "@/lib/demo-profile-context";

interface AdminGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupItems(items: AdminSearchItem[], group: AdminSearchItem["group"]) {
  return items.filter((item) => item.group === group);
}

export function AdminGlobalSearch({ open, onOpenChange }: AdminGlobalSearchProps) {
  const navigate = useNavigate();
  const { profileId } = useDemoProfile();

  const index = useMemo(() => buildAdminSearchIndex(), [profileId]);

  const pages = useMemo(() => groupItems(index, "pages"), [index]);
  const students = useMemo(() => groupItems(index, "students"), [index]);
  const teachers = useMemo(() => groupItems(index, "teachers"), [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (item: AdminSearchItem) => {
    onOpenChange(false);
    if (item.params?.id) {
      navigate({ to: "/students/$id", params: { id: item.params.id } });
      return;
    }
    navigate({ to: item.to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, students, teachers…" />
      <CommandList className="max-h-[min(420px,70vh)]">
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick links">
          <CommandItem
            value="command center dashboard home"
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/" });
            }}
          >
            <LayoutDashboard className="size-4" />
            Command Center
          </CommandItem>
          <CommandItem
            value="students roster list"
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/students" });
            }}
          >
            <Users className="size-4" />
            All Students
          </CommandItem>
          <CommandItem
            value="teachers faculty staff"
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/teachers" });
            }}
          >
            <GraduationCap className="size-4" />
            All Teachers
          </CommandItem>
        </CommandGroup>

        {students.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students">
              {students.map((item) => (
                <CommandItem key={item.id} value={item.value} onSelect={() => go(item)}>
                  <Users className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{item.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {teachers.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Teachers">
              {teachers.map((item) => (
                <CommandItem key={item.id} value={item.value} onSelect={() => go(item)}>
                  <GraduationCap className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.hint && (
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Pages">
          {pages.map((item) => (
            <CommandItem key={item.id} value={item.value} onSelect={() => go(item)}>
              <LayoutDashboard className="size-4 text-muted-foreground" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.hint && (
                <span className="text-[10px] text-muted-foreground shrink-0">{item.hint}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
