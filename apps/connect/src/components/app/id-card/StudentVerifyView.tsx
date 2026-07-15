import {
  Award,
  BookOpen,
  Building2,
  ClipboardCheck,
  Droplets,
  GraduationCap,
  MapPin,
  Phone,
  ShieldCheck,
  Trophy,
  User,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, Badge } from "@lumenx/ui";
import { cn } from "@lumenx/ui";
import { getInitials } from "@lumenx/utils";
import type { StudentIdQrPayload } from "@/lib/student/id-card-qr-payload";

type StudentVerifyViewProps = {
  profile: StudentIdQrPayload;
  compact?: boolean;
};

export function StudentVerifyView({ profile, compact = false }: StudentVerifyViewProps) {
  const {
    identity,
    academic,
    progressReports,
    achievements,
    certificates,
    competitions,
    examHistory,
    attendance,
  } = profile;

  const initials = getInitials(identity.name, 2);

  const validDate = new Date(identity.idCardValidTill);
  const isExpired = !Number.isNaN(validDate.getTime()) && validDate < new Date();

  return (
    <div className={cn("mx-auto w-full max-w-lg", compact ? "space-y-4" : "space-y-5 pb-8")}>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border px-4 py-3",
          isExpired
            ? "border-amber-500/30 bg-amber-500/10"
            : "border-emerald-500/30 bg-emerald-500/10",
        )}
      >
        <ShieldCheck
          className={cn("size-5 shrink-0", isExpired ? "text-amber-600" : "text-emerald-600")}
        />
        <div>
          <p
            className={cn(
              "text-sm font-semibold",
              isExpired ? "text-amber-800" : "text-emerald-800",
            )}
          >
            {isExpired ? "ID expired — contact school office" : "Official school student record"}
          </p>
          <p className="text-xs text-muted-foreground">
            {identity.institute} · Valid till {identity.idCardValidTill} · No login required
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-5 py-4 text-center text-white">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/90">
            Student profile
          </p>
          <h1 className="mt-1 font-display text-lg font-bold">{identity.institute}</h1>
        </div>
        <div className="flex flex-col items-center px-5 pb-5 pt-4">
          <Avatar className="size-20 ring-4 ring-primary/15">
            <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-700 text-2xl text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <h2 className="mt-3 text-center font-display text-xl font-bold">{identity.name}</h2>
          <p className="text-sm text-muted-foreground">
            {identity.class} · Sec {identity.section} · Roll {identity.rollNo}
          </p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">{identity.studentId}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-border bg-border text-sm">
          <InfoCell icon={Building2} label="House" value={identity.house} />
          <InfoCell icon={Droplets} label="Blood group" value={identity.bloodGroup} />
          <InfoCell
            icon={Users}
            label="Parent"
            value={identity.parentName}
            className="col-span-2"
          />
          <InfoCell
            icon={Phone}
            label="Emergency"
            value={identity.emergencyContact}
            className="col-span-2"
          />
          <InfoCell
            icon={MapPin}
            label="Address"
            value={identity.address}
            className="col-span-2"
            multiline
          />
        </dl>
      </section>

      <VerifySection icon={GraduationCap} title="Academic summary">
        <div className="grid grid-cols-3 gap-2">
          <StatPill label="Overall avg" value={`${academic.overallAvg}%`} />
          <StatPill label="Class rank" value={`#${academic.rank}`} />
          <StatPill label="Attendance" value={`${academic.attendancePct}%`} />
        </div>
        <div className="mt-3 space-y-2">
          {academic.performanceBySubject.map((s) => (
            <div key={s.subject} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.subject}</span>
              <span className="font-semibold">
                {s.score}%
                <span className="ml-1 text-xs text-muted-foreground">(prev {s.prev}%)</span>
              </span>
            </div>
          ))}
        </div>
      </VerifySection>

      {progressReports.length > 0 && (
        <VerifySection icon={BookOpen} title="Progress reports">
          {progressReports.map((rc) => (
            <div key={rc.term} className="rounded-xl border border-border/80 bg-muted/20 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{rc.term}</p>
                  <p className="text-xs text-muted-foreground">Published {rc.publishedOn}</p>
                </div>
                <Badge variant="secondary">
                  {rc.grade} · {rc.percentage}%
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Class rank #{rc.rank}</p>
              {!compact && (
                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {rc.subjects.map((s) => (
                    <li key={s.subject} className="flex justify-between text-xs">
                      <span>{s.subject}</span>
                      <span className="font-medium">
                        {s.score}% · {s.grade}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </VerifySection>
      )}

      {achievements.length > 0 && (
        <VerifySection icon={Trophy} title="Achievements">
          <div className="flex flex-wrap gap-2">
            {achievements.map((a) => (
              <Badge key={a.title} variant="outline" className="rounded-lg px-2.5 py-1 text-xs">
                {a.title} · {a.tier}
              </Badge>
            ))}
          </div>
        </VerifySection>
      )}

      {certificates.length > 0 && (
        <VerifySection icon={Award} title="Certificates">
          <ul className="space-y-2">
            {certificates.map((c) => (
              <li
                key={c.refNo}
                className="rounded-xl border border-border/80 bg-muted/20 p-3 text-sm"
              >
                <p className="font-semibold">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.issuer} · {c.issuedOn} · {c.refNo}
                </p>
              </li>
            ))}
          </ul>
        </VerifySection>
      )}

      {competitions.length > 0 && (
        <VerifySection icon={Trophy} title="Competitions & events">
          <ul className="space-y-2 text-sm">
            {competitions.map((c) => (
              <li
                key={c.title + c.date}
                className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0"
              >
                <span>{c.title}</span>
                <span className="shrink-0 font-medium text-primary">{c.result}</span>
              </li>
            ))}
          </ul>
        </VerifySection>
      )}

      <VerifySection icon={ClipboardCheck} title="Exams & attendance">
        <p className="mb-2 text-sm text-muted-foreground">
          {attendance.monthLabel}: {attendance.pct}% ({attendance.present} present /{" "}
          {attendance.workingDays} days)
        </p>
        {examHistory.length > 0 && (
          <ul className="space-y-1.5 text-sm">
            {examHistory.slice(0, 5).map((e) => (
              <li key={e.subject + e.date} className="flex justify-between">
                <span>
                  {e.subject} · {e.title}
                </span>
                <span className="font-medium">
                  {e.obtained}/{e.maxMarks} ({e.grade})
                </span>
              </li>
            ))}
          </ul>
        )}
      </VerifySection>

      <p className="text-center text-[11px] text-muted-foreground">
        School ID card profile · {new Date(profile.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

function VerifySection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </h3>
      {children}
    </section>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 px-2 py-2 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  className,
  multiline,
}: {
  icon: typeof User;
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={cn("flex gap-2.5 bg-card px-4 py-3", className)}>
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </dt>
        <dd className={cn("mt-0.5 text-sm font-medium", multiline && "leading-relaxed")}>
          {value}
        </dd>
      </div>
    </div>
  );
}
