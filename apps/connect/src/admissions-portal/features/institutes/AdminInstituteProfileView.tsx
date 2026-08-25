import type { DemoInstituteProfile } from "@lumenx/types";
import { SectionCard } from "@/components/app/SectionCard";

/** Read-only Admin institute profile sections — same content model as Admin `/institute`. */
export function AdminInstituteProfileView({ profile }: { profile: DemoInstituteProfile }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Institute information" className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <InfoRow label="Institute name" value={profile.name} />
            <InfoRow label="Founded" value={profile.founded} />
            <InfoRow label="Founder" value={profile.founder} />
            <InfoRow label="Principal" value={profile.principal} />
            <InfoRow label="Ranking" value={profile.ranking} className="sm:col-span-2" />
            <InfoRow label="Vision" value={profile.vision} className="sm:col-span-2" multiline />
            <InfoRow label="Mission" value={profile.mission} className="sm:col-span-2" multiline />
          </div>
        </SectionCard>

        <SectionCard title="Branding & contact">
          <div className="space-y-3 text-sm">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={`${profile.name} photo`}
                className="h-28 w-full rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-xs text-muted-foreground">
                {profile.logo || "No photo"}
              </div>
            )}
            <InfoRow label="Logo" value={profile.logo} />
            <InfoRow label="Phone" value={profile.phone} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Address" value={profile.address} multiline />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="History">
          {(profile.history ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No history entries yet.</p>
          ) : (
            <div className="space-y-4">
              {(profile.history ?? []).map((h) => (
                <div
                  key={`${h.year}-${h.event}`}
                  className="flex gap-4 text-sm border-b border-border/60 pb-4 last:border-0 last:pb-0"
                >
                  <span className="w-14 shrink-0 font-mono text-sm font-semibold text-primary">
                    {h.year}
                  </span>
                  <span className="leading-relaxed text-foreground">{h.event}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Awards & achievements">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Awards
              </p>
              {(profile.awards ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No awards listed.</p>
              ) : (
                <div className="space-y-3">
                  {(profile.awards ?? []).map((a) => (
                    <div key={`${a.title}-${a.year}`} className="text-sm">
                      <div className="font-medium text-foreground">{a.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {a.year} · {a.body}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Achievements
              </p>
              {(profile.achievements ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No achievements listed.</p>
              ) : (
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground">
                  {(profile.achievements ?? []).map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SectionCard>
      </div>

      {(profile.customFields ?? []).map((section) => (
        <SectionCard key={section.id} title={section.title || "Custom section"}>
          {section.entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No fields in this section.</p>
          ) : (
            <div className="space-y-3">
              {section.entries.map((entry) => {
                const subMatters = entry.fields
                  .map((f) => f.value.trim())
                  .filter(Boolean);
                const meta = [entry.year?.trim(), ...subMatters].filter(Boolean).join(" · ");
                return (
                  <div key={entry.id} className="text-sm">
                    <div className="font-medium text-foreground">
                      {entry.heading.trim() || "Untitled field"}
                    </div>
                    {meta ? (
                      <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      ))}
    </div>
  );
}

function InfoRow({
  label,
  value,
  className,
  multiline,
}: {
  label: string;
  value: string;
  className?: string;
  multiline?: boolean;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-foreground ${multiline ? "leading-relaxed whitespace-pre-wrap" : ""}`}>
        {value || "—"}
      </p>
    </div>
  );
}
