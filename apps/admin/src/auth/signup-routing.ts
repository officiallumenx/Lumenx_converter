/** Post-signup navigation — API mode skips demo OTP funnel. */
export function resolvePostSignupRoute(apiMode: boolean): string {
  return apiMode ? "/pending-verification" : "/verify-email-otp";
}
