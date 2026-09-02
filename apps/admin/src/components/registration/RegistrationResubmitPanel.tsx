import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AuthButton } from "@/auth/components/AuthButton";
import { resubmitRegistration } from "@/lib/registrations/api";
import { syncApiRegistrationFromBackend } from "@/auth/api-registration-state";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";

type Props = {
  registration: InstituteRegistrationDto;
  onResubmitted?: () => void;
};

export function RegistrationResubmitPanel({ registration, onResubmitted }: Props) {
  const payload = registration.payload;
  const [instituteName, setInstituteName] = useState(payload.instituteName);
  const [city, setCity] = useState(payload.city ?? "");
  const [state, setState] = useState(payload.state ?? "");
  const [address, setAddress] = useState(payload.address ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resubmitRegistration({
        applicantName: registration.applicantName,
        phone: registration.phone,
        payload: {
          ...payload,
          instituteName: instituteName.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          address: address.trim() || undefined,
        },
      });
      await syncApiRegistrationFromBackend();
      setSuccess(true);
      onResubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resubmit application.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
        <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          Application resubmitted
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Your updated application is back in the Nexus review queue. Typical turnaround is
          1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-muted/20 px-4 py-4 space-y-3 text-left"
    >
      <div>
        <p className="text-xs font-semibold text-foreground">Update and apply again</p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Fix the details Nexus flagged and resubmit without creating a new account.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Institute name
        </span>
        <input
          type="text"
          required
          value={instituteName}
          onChange={(e) => setInstituteName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            City
          </span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            State
          </span>
          <input
            type="text"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          Address
        </span>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
        />
      </label>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      <AuthButton type="submit" variant="primary" fullWidth loading={loading}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Resubmit application
      </AuthButton>
    </form>
  );
}
