import { useMemo } from "react";
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
import { CURRENT_INSTITUTE_ID } from "@/lib/institute-billing-store";
import { useDemoProfile } from "@/lib/demo-profile-context";
import { useAuth } from "@/auth/AuthContext";
import { getRolePermission, useRolesAccessRevision } from "@/lib/roles-access";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useInstituteContext } from "@/lib/institutes";

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
  const { user } = useAuth();
  const rolesRevision = useRolesAccessRevision();
  const instituteCtx = useInstituteContext();
  const instituteId = isApiAuthMode()
    ? instituteCtx.activeInstituteId || ""
    : user?.instituteId || CURRENT_INSTITUTE_ID;

  const index = useMemo(() => {
    void profileId;
    if (!instituteId) return [];
    return buildAdminSearchIndex({
      instituteId,
      accessRoleId: user?.accessRoleId,
    });
  }, [profileId, instituteId, user?.accessRoleId, rolesRevision]);

  const canSeeStudents =
    !user?.accessRoleId || getRolePermission(user.accessRoleId, "/students") !== "none";
  const canSeeTeachers =
    !user?.accessRoleId || getRolePermission(user.accessRoleId, "/teachers") !== "none";

  const pages = useMemo(() => groupItems(index, "pages"), [index]);
  const students = useMemo(() => groupItems(index, "students"), [index]);
  const teachers = useMemo(() => groupItems(index, "teachers"), [index]);

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
