import { useEffect, useMemo, useState } from "react";
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
import {
  buildAdminPeopleSearchItems,
  buildAdminSearchIndex,
  type AdminSearchItem,
} from "@/lib/admin-search-data";
import { useAuth } from "@/auth/AuthContext";
import { getRolePermission, useRolesAccessRevision } from "@/lib/roles-access";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
import { isInstituteUuid } from "@/lib/active-institute";

interface AdminGlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupItems(items: AdminSearchItem[], group: AdminSearchItem["group"]) {
  return items.filter((item) => item.group === group);
}

export function AdminGlobalSearch({ open, onOpenChange }: AdminGlobalSearchProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rolesRevision = useRolesAccessRevision();
  const instituteCtx = useInstituteContext();
  const instituteId = isApiAuthMode()
    ? instituteCtx.activeInstituteId || ""
    : "";
  const [peopleItems, setPeopleItems] = useState<AdminSearchItem[]>([]);

  const pageIndex = useMemo(() => {
    if (!instituteId) return [];
    return buildAdminSearchIndex({
      instituteId,
      accessRoleId: user?.accessRoleId,
    });
  }, [instituteId, user?.accessRoleId, rolesRevision]);

  useEffect(() => {
    if (!open || !instituteId || !isInstituteUuid(instituteId)) {
      setPeopleItems([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [students, teachers] = await Promise.all([
          listStudents({ instituteId }),
          listTeachers({ instituteId }),
        ]);
        if (cancelled) return;
        setPeopleItems(
          buildAdminPeopleSearchItems({
            instituteId,
            accessRoleId: user?.accessRoleId,
            students,
            teachers,
          }),
        );
      } catch {
        if (!cancelled) setPeopleItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, instituteId, user?.accessRoleId]);

  const canSeeStudents =
    !user?.accessRoleId || getRolePermission(user.accessRoleId, "/students") !== "none";
  const canSeeTeachers =
    !user?.accessRoleId || getRolePermission(user.accessRoleId, "/teachers") !== "none";

  const pages = useMemo(() => groupItems(pageIndex, "pages"), [pageIndex]);
  const students = useMemo(() => groupItems(peopleItems, "students"), [peopleItems]);
  const teachers = useMemo(() => groupItems(peopleItems, "teachers"), [peopleItems]);

  const go = (item: AdminSearchItem) => {
    if (item.instituteId !== instituteId) return;
    onOpenChange(false);
    if (item.params?.id) {
      navigate({ to: "/students/$id", params: { id: item.params.id } });
      return;
    }
    navigate({ to: item.to });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search this institute (Admin portal only)…" />
      <CommandList className="max-h-[min(420px,70vh)]">
        <CommandEmpty>No results in this institute.</CommandEmpty>

        <CommandGroup heading="Quick links · Admin portal">
          <CommandItem
            value="command center dashboard home"
            onSelect={() => {
              onOpenChange(false);
              navigate({ to: "/" });
            }}
          >
            <LayoutDashboard className="size-4" />
            Overview
          </CommandItem>
          {canSeeStudents && (
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
          )}
          {canSeeTeachers && (
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
          )}
        </CommandGroup>

        {students.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Students · this institute">
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
            <CommandGroup heading="Teachers · this institute">
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
        <CommandGroup heading="Pages · Admin portal">
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
