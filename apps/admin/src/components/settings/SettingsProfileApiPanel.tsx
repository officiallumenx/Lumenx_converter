/**
 * Settings profile — API mode. Loads/saves via GET/PATCH /api/v1/profiles/:id.
 * Never uses localStorage as source of truth.
 */
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { Button, Card, CardHeader, Pill } from "@lumenx/ui-admin";
import { Check } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { isInstituteUuid } from "@/lib/active-institute";
import { getProfile, updateOwnProfile } from "@/lib/identity";
import { useAdminToast } from "@/components/AdminActionToast";

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 py-3 border-b border-border last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint ? <div className="text-[11px] text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Inp(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={`rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm outline-none focus:border-primary ${props.className ?? ""}`}
    />
  );
}

export function SettingsProfileApiPanel() {
  const { user, patchAuthenticatedUser } = useAuth();
  const notify = useAdminToast();
  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const profileId = user?.id ?? "";

  useEffect(() => {
    if (!profileId || !isInstituteUuid(profileId)) {
      setLoadStatus("error");
      setLoadError("Signed-in profile id is missing or invalid.");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    setLoadError(null);
    void getProfile(profileId)
      .then((profile) => {
        if (cancelled) return;
        setName(profile.displayName);
        setPhone(profile.phone ?? "");
        setEmail(profile.email ?? user?.email ?? "");
        setLoadStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadStatus("error");
        setLoadError(err instanceof Error ? err.message : "Failed to load profile");
      });
    return () => {
      cancelled = true;
    };
  }, [profileId, user?.email]);

  const handleSave = () => {
    if (!profileId || !isInstituteUuid(profileId)) {
      notify("Cannot save profile without a valid user id");
      return;
    }
    const displayName = name.trim();
    if (!displayName) {
      notify("Full name is required");
      return;
    }
    setSaving(true);
    void updateOwnProfile(profileId, {
      displayName,
      phone: phone.trim() ? phone.trim() : null,
    })
      .then((profile) => {
        if (user) {
          patchAuthenticatedUser({
            ...user,
            name: profile.displayName,
            initials: profile.displayName
              .split(/\s+/)
              .map((p) => p[0]?.toUpperCase() ?? "")
              .join("")
              .slice(0, 2) || "U",
            phone: profile.phone ?? undefined,
            avatarUrl: profile.avatarUrl ?? undefined,
          });
        }
        setName(profile.displayName);
        setPhone(profile.phone ?? "");
        setEmail(profile.email ?? email);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        notify("Profile saved");
      })
      .catch((err) => {
        notify(err instanceof Error ? err.message : "Failed to save profile");
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const initials =
    user?.initials ??
    (name
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) ||
      "U");
  const institute = user?.instituteName ?? "—";
  const roleLabel = user?.role?.replace(/_/g, " ") ?? "admin";
  const title = user?.title ?? "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Logged-in profile"
          hint="GET/PATCH /api/v1/profiles · email is read-only"
          action={<Pill tone="neutral">API mode</Pill>}
        />
        <div className="px-5 pb-5">
          {loadStatus === "loading" ? (
            <p className="py-4 text-sm text-muted-foreground">Loading profile…</p>
          ) : loadStatus === "error" ? (
            <p className="py-4 text-sm text-destructive">
              {loadError ?? "Failed to load profile."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-5 py-4 border-b border-border mb-1">
                <div className="size-16 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center text-xl font-bold text-primary-foreground select-none">
                  {initials}
                </div>
                <div>
                  <div className="text-sm font-semibold">{name || "—"}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {title} · {institute}
                  </div>
                </div>
              </div>

              <Row label="Full name" hint="Maps to display_name">
                <Inp
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-52"
                />
              </Row>
              <Row label="Title / Designation" hint="From institute membership roles">
                <span className="text-xs text-muted-foreground">{title}</span>
              </Row>
              <Row label="Email address" hint="Login identity · not editable here">
                <span className="text-xs text-muted-foreground">{email || "—"}</span>
              </Row>
              <Row label="Phone number">
                <Inp
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-44"
                />
              </Row>
              <Row label="Role">
                <Pill tone="info">
                  {roleLabel.replace(/\b\w/g, (c) => c.toUpperCase())}
                </Pill>
              </Row>

              <div className="pt-4 flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saved ? (
                    <>
                      <Check className="size-3.5" /> Saved
                    </>
                  ) : saving ? (
                    "Saving…"
                  ) : (
                    "Save changes"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Account" hint="Session details for the signed-in user" />
        <div className="px-5 pb-5">
          <Row label="Account ID" hint="Read-only">
            <span className="text-xs font-mono text-muted-foreground">
              {user?.id ?? "—"}
            </span>
          </Row>
          <Row label="Institute">
            <span className="text-xs text-muted-foreground">{institute}</span>
          </Row>
          <Row label="Last login">
            <span className="text-xs text-muted-foreground">
              {user?.lastLoginAt
                ? new Date(user.lastLoginAt).toLocaleString("en-IN")
                : "This session"}
            </span>
          </Row>
        </div>
      </Card>
    </div>
  );
}
