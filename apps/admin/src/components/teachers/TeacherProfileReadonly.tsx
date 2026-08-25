import { BookOpen, Calendar, Eye, EyeOff, KeyRound, Mail, Phone, Shield } from "lucide-react";
import {
  TeacherAvatar,
  TeacherChip,
  TeacherDetailRow,
  TeacherRolePill,
  TeacherStatTile,
  TeacherStatusPill,
  teacherRoleLabel,
  type Teacher,
} from "./TeacherDisplay";

type TeacherProfileReadonlyProps = {
  teacher: Teacher;
  showPassword: boolean;
  onTogglePassword: () => void;
};

export function TeacherProfileReadonly({
  teacher: selected,
  showPassword,
  onTogglePassword,
}: TeacherProfileReadonlyProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <TeacherAvatar name={selected.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold">{selected.name}</div>
          <div className="text-sm text-muted-foreground">{selected.dept}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TeacherRolePill role={selected.role} />
            <TeacherStatusPill status={selected.status} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        <TeacherDetailRow
          label="Teacher role"
          value={teacherRoleLabel(selected.role)}
          icon={<Shield className="size-3.5" />}
        />
        <TeacherDetailRow
          label="Email"
          value={selected.email}
          icon={<Mail className="size-3.5" />}
        />
        <TeacherDetailRow
          label="Phone"
          value={selected.phone || "—"}
          icon={<Phone className="size-3.5" />}
        />
        <div className="sm:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
            Account password
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <KeyRound className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-mono text-xs">
              {showPassword ? selected.password : "••••••••••••"}
            </span>
            <button
              type="button"
              onClick={onTogglePassword}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-hover"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
          </div>
        </div>
        <TeacherDetailRow label="Employee ID" value={selected.employeeId} />
        <TeacherDetailRow
          label="Joined"
          value={selected.joined}
          icon={<Calendar className="size-3.5" />}
        />
        <TeacherDetailRow
          label="Date of birth"
          value={selected.dateOfBirth || "—"}
          icon={<Calendar className="size-3.5" />}
        />
        <TeacherDetailRow
          label="Portal access"
          value={selected.portalAccess}
          icon={<Shield className="size-3.5" />}
        />
        <TeacherDetailRow label="Last login" value={selected.lastLogin} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <TeacherStatTile label="Classes" value={String(selected.classes)} />
        <TeacherStatTile label="Last login" value={selected.lastLogin} />
        <TeacherStatTile
          label="Credentials"
          value={selected.credentialsSentAt ?? "Not sent"}
        />
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
          Qualification
        </div>
        <div className="text-xs">{selected.qualification || "—"}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
          <BookOpen className="size-3" /> Subjects
        </div>
        <div className="flex flex-wrap gap-1.5">
          {selected.subjects.map((s) => (
            <TeacherChip key={s}>{s}</TeacherChip>
          ))}
        </div>
      </div>
      {selected.assignedSections.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Assigned sections
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.assignedSections.map((s) => (
              <TeacherChip key={s} mono>
                Grade {s}
              </TeacherChip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
