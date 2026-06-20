import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardHeader, Button, Field, TextInput, TextArea } from "@lumenx/ui-admin";
import { INSTITUTE_PROFILE } from "@/lib/admin-module-data";
import { Save, CheckCircle2 } from "lucide-react";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/institute")({
  head: () => ({ meta: [{ title: "Institute Profile — LumenX Admin" }] }),
  component: InstitutePage,
});

function InstitutePage() {
  const [profile, setProfile] = useState(INSTITUTE_PROFILE);
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, []);

  return (
    <AppShell
      title="Institute Profile"
      subtitle="Public identity · Connect login, verify pages, and certificates"
      actions={
        <Button variant="primary" onClick={handleSave}>
          {saved ? <CheckCircle2 className="size-3.5" /> : <Save className="size-3.5" />}
          {saved ? "Saved" : "Save profile"}
        </Button>
      }
    >
      {saved && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-success/30 bg-success/10 text-xs text-success flex items-center gap-2">
          <CheckCircle2 className="size-3.5" /> Profile saved successfully
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        <Card className="col-span-12 lg:col-span-8">
          <CardHeader title="Institute information" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Institute name" required>
              <TextInput value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </Field>
            <Field label="Founded">
              <TextInput value={profile.founded} onChange={(e) => setProfile({ ...profile, founded: e.target.value })} />
            </Field>
            <Field label="Founder">
              <TextInput value={profile.founder} onChange={(e) => setProfile({ ...profile, founder: e.target.value })} />
            </Field>
            <Field label="Principal">
              <TextInput value={profile.principal} onChange={(e) => setProfile({ ...profile, principal: e.target.value })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Ranking">
                <TextInput value={profile.ranking} onChange={(e) => setProfile({ ...profile, ranking: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Vision">
                <TextArea value={profile.vision} onChange={(e) => setProfile({ ...profile, vision: e.target.value })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Mission">
                <TextArea value={profile.mission} onChange={(e) => setProfile({ ...profile, mission: e.target.value })} />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-4">
          <CardHeader title="Logo & contact" />
          <div className="px-5 pb-5 space-y-4">
            <div className="h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
              {profile.logo} · Upload logo
            </div>
            <Field label="Phone"><TextInput value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
            <Field label="Email"><TextInput value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} /></Field>
            <Field label="Address"><TextArea value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="History" />
          <div className="px-5 pb-5 space-y-3">
            {profile.history.map((h) => (
              <div key={h.year} className="flex gap-4 text-xs border-b border-border pb-3 last:border-0">
                <span className="font-mono text-primary w-12 shrink-0">{h.year}</span>
                <span className="text-muted-foreground">{h.event}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-12 lg:col-span-6">
          <CardHeader title="Awards & achievements" />
          <div className="px-5 pb-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Awards</div>
              {profile.awards.map((a) => (
                <div key={a.title} className="text-xs py-2 border-b border-border last:border-0">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-muted-foreground">{a.body} · {a.year}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Achievements</div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                {profile.achievements.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
