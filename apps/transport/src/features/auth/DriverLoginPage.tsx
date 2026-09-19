import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { AuthHeader, AuthScreen } from "@/components/auth/auth-screen";
import { COUNTRIES, PhoneInput, validatePhone } from "@/components/auth/phone-input";
import { DriverMark } from "@/components/app/driver-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TransportInstituteRequiredError, useTransportAuth } from "@/lib/auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function DriverLoginPage() {
  const navigate = useNavigate();
  const { user, hydrated, signInWithPhonePin } = useTransportAuth();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [instituteId, setInstituteId] = useState("");
  const [needInstitute, setNeedInstitute] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const country = COUNTRIES[0]!;

  useEffect(() => {
    if (hydrated && user) void navigate({ to: "/" });
  }, [hydrated, user, navigate]);

  const handlePinSignIn = async () => {
    setApiError(null);
    if (!validatePhone(phone, country)) {
      setApiError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!/^\d{4,8}$/.test(pin.trim())) {
      setApiError("Enter your 4–8 digit app account PIN.");
      return;
    }
    if (needInstitute) {
      if (!UUID_RE.test(instituteId.trim())) {
        setApiError("Enter the institute ID from your Admin (UUID).");
        return;
      }
    }
    setLoading(true);
    try {
      await signInWithPhonePin(
        phone,
        pin,
        needInstitute ? instituteId.trim() : undefined,
      );
      toast.success("Signed in");
      void navigate({ to: "/" });
    } catch (err) {
      if (err instanceof TransportInstituteRequiredError) {
        setNeedInstitute(true);
        setApiError(
          "This phone is linked to more than one institute. Enter the institute ID from Admin.",
        );
      } else {
        setApiError(
          err instanceof Error
            ? err.message
            : "No Transport account found. Ask Admin to set your PIN and assign a vehicle.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hydrated || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <AuthScreen>
      <AuthHeader
        title="Driver sign in"
        subtitle="Use the mobile number and app account PIN from your institute Admin"
        icon={<DriverMark className="h-12 w-12" />}
      />
      <div className="space-y-3">
        <PhoneInput
          country={country}
          value={phone}
          onChange={setPhone}
          autoFocus
          onEnter={() => void handlePinSignIn()}
        />
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="App account PIN"
          maxLength={8}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handlePinSignIn();
          }}
        />
        {needInstitute ? (
          <Input
            type="text"
            autoComplete="off"
            placeholder="Institute ID (from Admin)"
            value={instituteId}
            onChange={(e) => setInstituteId(e.target.value.trim())}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handlePinSignIn();
            }}
          />
        ) : null}
        {apiError ? <p className="text-sm text-destructive">{apiError}</p> : null}
        <p className="text-xs text-muted-foreground">
          Admin must set your app PIN and assign a vehicle before you can sign in.
        </p>
        <Button className="w-full" disabled={loading} onClick={() => void handlePinSignIn()}>
          {loading ? <Loader2 className="animate-spin" /> : "Sign in"}
        </Button>
      </div>
    </AuthScreen>
  );
}
