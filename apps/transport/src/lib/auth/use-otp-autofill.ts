import { useEffect } from "react";

type OtpCredential = Credential & { code?: string };

/**
 * Web OTP API — fills OTP from SMS when the platform supports it.
 * Falls back silently; users can always type the code manually.
 */
export function useOtpAutofill(onCode: (code: string) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const ac = new AbortController();

    if ("OTPCredential" in window && navigator.credentials?.get) {
      void navigator.credentials
        .get({
          otp: { transport: ["sms"] },
          signal: ac.signal,
        } as CredentialRequestOptions)
        .then((credential) => {
          const code = (credential as OtpCredential | null)?.code;
          if (code) onCode(code.replace(/\D/g, "").slice(0, 6));
        })
        .catch(() => {
          /* user dismissed or unsupported */
        });
    }

    return () => ac.abort();
  }, [enabled, onCode]);
}
