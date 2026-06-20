import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { StudentVerifyView } from "@/components/app/id-card/StudentVerifyView";
import {
  buildStudentVerifyUrl,
  resolveStudentVerificationProfile,
} from "@/lib/student/id-card-qr-payload";
import { decodeStudentProfileToken } from "@/lib/student/profile-qr-token";
import { GraduationCap } from "lucide-react";

const searchSchema = z.object({
  d: z.string().optional(),
});

export const Route = createFileRoute("/verify/$studentId")({
  validateSearch: searchSchema,
  head: ({ params }) => ({
    meta: [
      { title: `${params.studentId} — Student profile` },
      { name: "description", content: "Official student profile from LumenX Academy ID card." },
    ],
  }),
  component: VerifyStudentPage,
});

function VerifyStudentPage() {
  const { studentId } = Route.useParams();
  const { d } = Route.useSearch();
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const verifyUrl = buildStudentVerifyUrl(studentId, origin);

  const profile =
    (d ? decodeStudentProfileToken(d, verifyUrl) : null) ??
    resolveStudentVerificationProfile(studentId, origin);

  if (!profile) {
    return (
      <PublicProfileShell>
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="font-display text-lg font-semibold">Student not found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No profile for ID <strong>{studentId}</strong>. Please contact the school office.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Open LumenX Connect
          </Link>
        </div>
      </PublicProfileShell>
    );
  }

  return (
    <PublicProfileShell institute={profile.identity.institute}>
      <StudentVerifyView profile={profile} />
    </PublicProfileShell>
  );
}

function PublicProfileShell({
  children,
  institute = "LumenX Academy",
}: {
  children: React.ReactNode;
  institute?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-2 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Student profile
            </p>
            <p className="font-display text-sm font-bold leading-tight">{institute}</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5">{children}</main>
    </div>
  );
}
