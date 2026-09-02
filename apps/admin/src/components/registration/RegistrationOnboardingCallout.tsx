/** Plain-language explainer for institute self-registration (Admin applicant vs Nexus review). */
export function RegistrationOnboardingCallout({
  variant = "pending",
}: {
  variant?: "pending" | "welcome";
}) {
  if (variant === "welcome") {
    return (
      <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3 text-left text-[11px] text-muted-foreground">
        <p className="font-medium text-foreground text-xs mb-1.5">
          New institute onboarding
        </p>
        <p>
          Sign up here in <strong className="text-foreground">Admin</strong> to apply.
          The LumenX platform team reviews applications in{" "}
          <strong className="text-foreground">Nexus</strong> — you&apos;ll see a pending
          screen until your school is approved, then you can use the full dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3 text-left text-[11px] text-muted-foreground">
      <p className="font-medium text-foreground text-xs mb-1.5">How this works</p>
      <ul className="space-y-1.5 list-none">
        <li>
          <span className="font-medium text-foreground">Admin</span> — you applied here;
          this is where you&apos;ll run your school after approval.
        </li>
        <li>
          <span className="font-medium text-foreground">Nexus</span> — LumenX platform
          team reviews new institutes. There is no registration queue inside Admin.
        </li>
        <li>
          When approved, your institute is created and you can open Students, Fees, Roles
          &amp; Access, and the rest of the dashboard.
        </li>
      </ul>
    </div>
  );
}
